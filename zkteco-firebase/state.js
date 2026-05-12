/**
 * Shared runtime state.
 * Written by routes/iclock.js (ADMS) and services/zklib.js (ZKLib).
 * Read by the /health endpoint in index.js.
 */
export const state = {
  mode: 'adms',           // set at startup from config.syncMode
  zkConnected: false,     // true only when ZKLib TCP socket is live
  lastDeviceContact: 0,   // ms timestamp of last HTTP contact from device (ADMS)
  lastPunch: null,        // { userId: string, time: ISO string } | null
  startTime: Date.now(),
};
