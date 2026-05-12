import admin from 'firebase-admin';
import config from '../config.js';

// ── Validate credentials before attempting init ──────────────────────────────
const missingCreds = ['projectId', 'privateKey', 'clientEmail'].filter(
  (k) => !config.firebase[k],
);
if (missingCreds.length > 0) {
  const varNames = {
    projectId: 'FIREBASE_PROJECT_ID',
    privateKey: 'FIREBASE_PRIVATE_KEY',
    clientEmail: 'FIREBASE_CLIENT_EMAIL',
  };
  console.error('✗ Missing required Firebase environment variables:');
  missingCreds.forEach((k) => console.error(`  - ${varNames[k]}`));
  console.error('\nCopy .env.example to .env and fill in your Firebase service account credentials.');
  process.exit(1);
}

const serviceAccount = {
  type: 'service_account',
  project_id: config.firebase.projectId,
  private_key_id: config.firebase.privateKeyId,
  private_key: config.firebase.privateKey,
  client_email: config.firebase.clientEmail,
  client_id: config.firebase.clientId,
  auth_uri: config.firebase.authUri,
  token_uri: config.firebase.tokenUri,
  auth_provider_x509_cert_url: config.firebase.authProviderCertUrl,
  client_x509_cert_url: config.firebase.clientCertUrl,
};

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: config.firebase.projectId,
  });
} catch (error) {
  console.error('✗ Firebase initialization failed:', error.message);
  console.error('  Check that FIREBASE_PRIVATE_KEY is correctly formatted (\\n not literal newlines).');
  process.exit(1);
}

export const db = admin.firestore();
export const firebaseAdmin = admin;

// ── Helper: format Date → "HH:mm" ────────────────────────────────────────────
function toTimeStr(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// ── Helper: format Date → "yyyy-MM-dd" ───────────────────────────────────────
function toDateStr(date) {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

// ── Helper: work hours between two "HH:mm" strings ───────────────────────────
function calcWorkMinutes(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const [sh, sm] = checkIn.split(':').map(Number);
  const [eh, em] = checkOut.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

/**
 * Determine attendance status from a check-in time string ("HH:mm").
 *   ≤ WORK_START_HOUR:00           → present
 *   WORK_START_HOUR+1 to LATE_CUTOFF_HOUR → late
 *   > LATE_CUTOFF_HOUR             → half_day
 */
function checkInStatus(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMins = h * 60 + m;
  const workStartMins = config.workTime.startHour * 60;
  const lateCutoffMins = config.workTime.lateCutoffHour * 60;

  if (totalMins <= workStartMins) return 'present';
  if (totalMins <= lateCutoffMins) return 'late';
  return 'half_day';
}

// ── Look up an employee document by their LX50 user number ───────────────────
async function getEmployeeByZkUserId(zkUserId) {
  const snapshot = await db
    .collection('employees')
    .where('zkUserId', '==', String(zkUserId))
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}

// ── Find existing attendance record for one employee on one date ──────────────
async function findAttendanceRecord(employeeId, dateStr) {
  // dateStr = "yyyy-MM-dd"
  const dayStart = admin.firestore.Timestamp.fromDate(new Date(`${dateStr}T00:00:00.000Z`));
  const dayEnd   = admin.firestore.Timestamp.fromDate(new Date(`${dateStr}T23:59:59.999Z`));

  const snapshot = await db
    .collection('attendance')
    .where('employeeId', '==', employeeId)
    .where('date', '>=', dayStart)
    .where('date', '<=', dayEnd)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}

/**
 * Write (or update) one attendance record in the format the AttendanceLog page expects.
 *
 * Called for each individual fingerprint punch from the LX50.
 *   status "0" = Check In  → create / update record with check-in time + status
 *   status "1" = Check Out → update record's checkOut + recalc status to half_day if short
 *   other status codes     → ignored (Break/Overtime don't affect the daily record)
 *
 * If the device user is not mapped to an employee (no zkUserId set), the raw
 * punch is stored in `device_punches` so no data is lost.
 */
export async function writeAttendanceFromPunch(record, deviceSerial) {
  const zkStatus = parseInt(record.status, 10);

  // Only act on Check In (0) and Check Out (1)
  if (zkStatus !== 0 && zkStatus !== 1) {
    console.log(`ℹ Skipping punch status ${record.status} (${record.statusLabel}) for userId=${record.userId}`);
    return;
  }

  const isCheckIn  = zkStatus === 0;
  const isCheckOut = zkStatus === 1;
  const punchDate  = record.dateTime instanceof Date ? record.dateTime : new Date(record.dateTime);
  const dateStr    = toDateStr(punchDate);
  const timeStr    = toTimeStr(punchDate);

  // 1. Resolve device user → employee
  let employee;
  try {
    employee = await getEmployeeByZkUserId(record.userId);
  } catch (err) {
    console.error(`✗ Employee lookup failed for zkUserId=${record.userId}:`, err.message);
  }

  if (!employee) {
    // Store raw punch so no data is lost — admin can map the user later
    await db.collection('device_punches').add({
      zkUserId: String(record.userId),
      rawDateTime: record.rawDateTime,
      punchType: isCheckIn ? 'check_in' : 'check_out',
      deviceSerial,
      syncedAt: admin.firestore.Timestamp.now(),
    });
    console.warn(
      `⚠ No employee found for zkUserId=${record.userId} — raw punch saved to device_punches.`,
      'Set the "رقم الجهاز" field on the employee record to link them.',
    );
    return;
  }

  // 2. Find existing record for this employee on this date
  let existing;
  try {
    existing = await findAttendanceRecord(employee.id, dateStr);
  } catch (err) {
    console.error(`✗ Attendance lookup failed for ${employee.id} on ${dateStr}:`, err.message);
    return;
  }

  const dayTimestamp = admin.firestore.Timestamp.fromDate(new Date(`${dateStr}T00:00:00.000Z`));

  if (isCheckIn) {
    if (existing) {
      // Already has a record — only update if this punch is earlier than stored check-in
      const storedCheckIn = existing.checkIn || '99:99';
      if (timeStr < storedCheckIn) {
        const status = checkInStatus(timeStr);
        const workData = existing.checkOut
          ? buildWorkData(timeStr, existing.checkOut)
          : { actualHours: 0, overtimeHours: 0, lateMinutes: 0 };
        await db.collection('attendance').doc(existing.id).update({
          checkIn: timeStr,
          status,
          source: 'device',
          ...workData,
        });
        console.log(`✓ Updated check-in for ${employee.name || employee.nameAr} → ${timeStr} (${status})`);
      } else {
        console.log(`ℹ Later check-in punch ignored for ${employee.name || employee.nameAr} (already has ${storedCheckIn})`);
      }
    } else {
      // First punch of the day — create the record
      const status = checkInStatus(timeStr);
      const docId  = `${employee.id}_${dateStr}`;
      await db.collection('attendance').doc(docId).set({
        employeeId:   employee.id,
        date:         dayTimestamp,
        status,
        checkIn:      timeStr,
        checkOut:     '',
        notes:        '',
        actualHours:  0,
        overtimeHours: 0,
        lateMinutes:  Math.max(0, (punchDate.getHours() * 60 + punchDate.getMinutes()) - config.workTime.startHour * 60),
        source:       'device',
        deviceSerial,
        createdAt:    admin.firestore.Timestamp.now(),
      });
      console.log(`✓ Check-in recorded: ${employee.name || employee.nameAr} at ${timeStr} → ${status}`);
    }
    return;
  }

  if (isCheckOut) {
    if (existing) {
      const checkIn = existing.checkIn || '';
      const workData = checkIn ? buildWorkData(checkIn, timeStr) : { actualHours: 0, overtimeHours: 0, lateMinutes: existing.lateMinutes || 0 };

      // Downgrade to half_day if they worked less than HALF_DAY_HOURS
      let status = existing.status;
      if (workData.actualHours > 0 && workData.actualHours < config.workTime.halfDayHours) {
        status = 'half_day';
      }

      await db.collection('attendance').doc(existing.id).update({
        checkOut: timeStr,
        status,
        source: 'device',
        ...workData,
      });
      console.log(`✓ Check-out recorded: ${employee.name || employee.nameAr} at ${timeStr} (${workData.actualHours}h worked)`);
    } else {
      // Check-out with no prior check-in — create record anyway
      const docId = `${employee.id}_${dateStr}`;
      await db.collection('attendance').doc(docId).set({
        employeeId:   employee.id,
        date:         dayTimestamp,
        status:       'present',
        checkIn:      '',
        checkOut:     timeStr,
        notes:        '',
        actualHours:  0,
        overtimeHours: 0,
        lateMinutes:  0,
        source:       'device',
        deviceSerial,
        createdAt:    admin.firestore.Timestamp.now(),
      });
      console.log(`✓ Check-out only recorded for ${employee.name || employee.nameAr} at ${timeStr} (no prior check-in)`);
    }
  }
}

function buildWorkData(checkIn, checkOut) {
  const totalMins = calcWorkMinutes(checkIn, checkOut);
  const actualHours = Math.round((totalMins / 60) * 100) / 100;
  const overtimeHours = Math.max(0, Math.round((actualHours - 8) * 100) / 100);
  const [sh, sm] = checkIn.split(':').map(Number);
  const shiftStartMins = config.workTime.startHour * 60;
  const lateMinutes = Math.max(0, (sh * 60 + sm) - shiftStartMins);
  return { actualHours, overtimeHours, lateMinutes };
}

/**
 * Process a batch of punches — called for both ADMS batch and ZKLib pull.
 */
export async function batchWriteAttendanceFromPunches(records, deviceSerial) {
  let saved = 0;
  for (const record of records) {
    try {
      await writeAttendanceFromPunch(record, deviceSerial);
      saved++;
    } catch (err) {
      console.error(`✗ Failed to process punch for userId=${record.userId}:`, err.message);
    }
  }
  console.log(`✓ Processed ${saved}/${records.length} punch(es) from batch`);
}

/**
 * Save or update device metadata in the `devices` collection.
 * recordCount = actual number of records processed (fixes the always-1 bug).
 */
export async function updateDeviceInfo(deviceSerial, ipAddress, recordCount = 1) {
  try {
    const deviceRef = db.collection(config.collections.devices).doc(deviceSerial);
    await deviceRef.set(
      {
        serial: deviceSerial,
        lastSeen: admin.firestore.Timestamp.now(),
        ipAddress,
        totalPunches: admin.firestore.FieldValue.increment(recordCount),
      },
      { merge: true },
    );
    console.log(`✓ Device info updated: ${deviceSerial} (+${recordCount} punch(es))`);
  } catch (error) {
    console.error('✗ Error updating device info:', error.message);
    throw error;
  }
}

export default {
  db,
  firebaseAdmin,
  writeAttendanceFromPunch,
  batchWriteAttendanceFromPunches,
  updateDeviceInfo,
};
