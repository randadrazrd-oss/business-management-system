import dotenv from 'dotenv';

dotenv.config();

const rawMode = (process.env.SYNC_MODE || 'adms').toLowerCase();
if (rawMode !== 'adms' && rawMode !== 'zklib') {
  console.error(`✗ Invalid SYNC_MODE: "${rawMode}". Must be "adms" or "zklib".`);
  process.exit(1);
}

export const config = {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',

  // Sync mode: "adms" (device pushes HTTP) or "zklib" (server pulls TCP)
  syncMode: rawMode,

  // Work-time thresholds — used to auto-determine attendance status from punch time
  workTime: {
    startHour:      parseInt(process.env.WORK_START_HOUR    || '9',  10), // 9 AM = on time
    lateCutoffHour: parseInt(process.env.LATE_CUTOFF_HOUR   || '11', 10), // after 11 AM = half_day
    halfDayHours:   parseFloat(process.env.HALF_DAY_HOURS   || '4'),      // <4h worked = half_day on check-out
  },

  // ZKTeco device (used only in zklib mode)
  device: {
    ip: process.env.DEVICE_IP || '',
    port: parseInt(process.env.DEVICE_PORT || '4370', 10),
    serial: process.env.DEVICE_SERIAL || 'BR63232460857',
  },

  // Firebase Admin SDK — from service account JSON
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    clientId: process.env.FIREBASE_CLIENT_ID,
    authUri:
      process.env.FIREBASE_AUTH_URI ||
      'https://accounts.google.com/o/oauth2/auth',
    tokenUri:
      process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
    authProviderCertUrl:
      process.env.FIREBASE_AUTH_PROVIDER_CERT_URL ||
      'https://www.googleapis.com/oauth2/v1/certs',
    clientCertUrl: process.env.FIREBASE_CLIENT_CERT_URL,
  },

  // Firestore collection names
  collections: {
    attendance: 'attendance',
    devices: 'devices',
  },

  // ZKTeco status codes → human labels
  statusMap: {
    0: 'Check In',
    1: 'Check Out',
    2: 'Break Out',
    3: 'Break In',
    4: 'Overtime In',
    5: 'Overtime Out',
  },

  // ZKTeco verification method codes → human labels
  verificationMap: {
    0: 'Password',
    1: 'Fingerprint',
    2: 'Card',
    3: 'Face',
    4: 'Vein',
    15: 'Face Recognition',
  },
};

export default config;
