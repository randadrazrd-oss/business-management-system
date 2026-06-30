import express from 'express';
import {
  batchWriteAttendanceFromPunches,
  writeAttendanceFromPunch,
  updateDeviceInfo,
} from '../services/firebase.js';
import { parseAttendanceBatch } from '../services/parser.js';
import { state } from '../state.js';

const router = express.Router();

router.get('/cdata', (req, res, next) => {
  if (req.query.options !== 'all') {
    next();
    return;
  }

  const deviceSerial = req.query.SN || 'UNKNOWN';
  console.log(`Device options request: SN=${deviceSerial}`);
  state.lastDeviceContact = Date.now();
  res.type('text/plain').send([
    `GET OPTION FROM: ${deviceSerial}`,
    'Stamp=0',
    'OpStamp=0',
    'ErrorDelay=30',
    'Delay=15',
    'TransTimes=00:00;14:00',
    'TransInterval=1',
    'TransFlag=1111000000',
    'Realtime=1',
    'Encrypt=0',
  ].join('\n'));
});

/**
 * GET /iclock/cdata
 * Device polls this endpoint for configuration (heartbeat).
 */
router.get('/cdata', (req, res) => {
  const deviceSerial = req.query.SN || 'UNKNOWN';
  console.log(`📱 Device poll (GET /iclock/cdata): SN=${deviceSerial}`);
  state.lastDeviceContact = Date.now();
  res.send('OK');
});

/**
 * POST /iclock/cdata
 * Device sends attendance records here (ADMS push mode).
 * Each punch is mapped to an employee and written to the `attendance` collection
 * in the format the AttendanceLog page expects (status: present/late/half_day).
 */
router.post('/cdata', async (req, res) => {
  try {
    const deviceSerial = req.query.SN || 'UNKNOWN';
    const rawBody = req.body || '';

    console.log(`📲 Received attendance data from device: SN=${deviceSerial}`);
    console.log(`   Raw data length: ${rawBody.length} bytes`);

    state.lastDeviceContact = Date.now();

    if (!rawBody || typeof rawBody !== 'string') {
      console.warn('⚠ Empty or invalid body received');
      return res.send('OK');
    }

    const records = parseAttendanceBatch(rawBody);

    if (records.length === 0) {
      console.warn('⚠ No valid records found in batch');
      return res.send('OK');
    }

    // Write each punch to the attendance collection in site format
    if (records.length === 1) {
      await writeAttendanceFromPunch(records[0], deviceSerial);
    } else {
      await batchWriteAttendanceFromPunches(records, deviceSerial);
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await updateDeviceInfo(deviceSerial, clientIp, records.length);

    const last = records[records.length - 1];
    state.lastPunch = { userId: last.userId, time: last.dateTime.toISOString() };

    console.log(`✓ Processed ${records.length} punch(es) from device: ${deviceSerial}`);
    res.send('OK');
  } catch (error) {
    console.error('✗ Error processing attendance data:', error.message);
    res.status(500).send('ERROR');
  }
});

/**
 * POST /iclock/registry
 * Some ZKTeco firmware versions register the device after each config poll.
 * Returning OK keeps the ADMS session healthy so punches can be pushed later.
 */
router.post('/registry', (req, res) => {
  const deviceSerial = req.query.SN || 'UNKNOWN';
  console.log(`Device registry: SN=${deviceSerial}`);
  state.lastDeviceContact = Date.now();
  res.send('OK');
});

/**
 * GET /iclock/getrequest
 * Device checks for pending server commands.
 */
router.get('/getrequest', (req, res) => {
  console.log('📋 Device checking for commands: GET /iclock/getrequest');
  state.lastDeviceContact = Date.now();
  res.send('OK');
});

/**
 * POST /iclock/devicecmd
 * Device confirms a command was executed.
 */
router.post('/devicecmd', (req, res) => {
  console.log('✓ Device command confirmed: POST /iclock/devicecmd');
  res.send('OK');
});

export default router;
