import ZKLib from 'node-zklib';
import config from '../config.js';
import { batchWriteAttendanceFromPunches, writeAttendanceFromPunch, updateDeviceInfo } from './firebase.js';
import { state } from '../state.js';

const RETRY_INTERVAL_MS = 30_000;

let retryTimer = null;
let zkInstance = null;
let stopping = false;

/**
 * Map a node-zklib attendance record to our internal format.
 * node-zklib returns: { uid, id, state, timestamp, type }
 */
function mapZKRecord(rec) {
  const ts = rec.timestamp instanceof Date ? rec.timestamp : new Date(rec.timestamp);
  // rawDateTime mirrors the ADMS format so dedup doc IDs are consistent
  const rawDateTime = ts.toISOString().slice(0, 19).replace('T', ' ');
  const statusCode = String(rec.state ?? 0);
  const verifyCode = String(rec.type ?? 1);

  return {
    userId: String(rec.id || rec.uid),
    rawDateTime,
    dateTime: ts,
    status: statusCode,
    statusLabel: config.statusMap[parseInt(statusCode, 10)] || 'Unknown',
    verification: verifyCode,
    verificationLabel: config.verificationMap[parseInt(verifyCode, 10)] || 'Unknown',
    workCode: '',
  };
}

/**
 * Attempt to connect and pull attendance records from the device.
 * On any failure, schedules a retry after RETRY_INTERVAL_MS.
 */
export async function startZKLibSync() {
  if (stopping) return;

  if (!config.device.ip) {
    console.warn('⚠ DEVICE_IP is not set — ZKLib mode cannot connect.');
    console.warn('  Add DEVICE_IP=192.168.0.x to your .env and restart.');
    scheduleRetry();
    return;
  }

  try {
    console.log(
      `🔌 ZKLib: connecting to ${config.device.ip}:${config.device.port} ...`,
    );

    zkInstance = new ZKLib({
      ip: config.device.ip,
      port: config.device.port,
      inport: 5200,
      timeout: 10000,
    });

    await zkInstance.createSocket();
    state.zkConnected = true;
    console.log(`✓ ZKLib: connected to device at ${config.device.ip}:${config.device.port}`);

    await pullAndSave();
  } catch (error) {
    state.zkConnected = false;
    zkInstance = null;
    console.error(`✗ ZKLib connection failed: ${error.message}`);
    scheduleRetry();
  }
}

async function pullAndSave() {
  if (stopping) return;

  try {
    const result = await zkInstance.getAttendances();
    const rawRecords = result?.data ?? [];

    if (rawRecords.length === 0) {
      console.log('📋 ZKLib: no attendance records on device');
      scheduleRetry();
      return;
    }

    console.log(`📲 ZKLib: retrieved ${rawRecords.length} record(s) from device`);
    const records = rawRecords.map(mapZKRecord);

    const serial = config.device.serial;
    if (records.length === 1) {
      await writeAttendanceFromPunch(records[0], serial);
    } else {
      await batchWriteAttendanceFromPunches(records, serial);
    }

    await updateDeviceInfo(serial, config.device.ip, records.length);

    const last = records[records.length - 1];
    state.lastPunch = { userId: last.userId, time: last.dateTime.toISOString() };

    console.log(`✓ ZKLib: synced ${records.length} record(s)`);
  } catch (error) {
    state.zkConnected = false;
    console.error(`✗ ZKLib sync error: ${error.message}`);
    safeDisconnect();
    scheduleRetry();
    return;
  }

  scheduleRetry();
}

function scheduleRetry() {
  if (stopping) return;
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(startZKLibSync, RETRY_INTERVAL_MS);
  console.log(`⏳ ZKLib: next sync in ${RETRY_INTERVAL_MS / 1000}s`);
}

function safeDisconnect() {
  if (!zkInstance) return;
  try {
    zkInstance.disconnect();
  } catch (_) {
    // best-effort
  }
  zkInstance = null;
}

/**
 * Gracefully stop ZKLib polling (called on SIGTERM/SIGINT).
 */
export function stopZKLibSync() {
  stopping = true;
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  safeDisconnect();
  state.zkConnected = false;
}
