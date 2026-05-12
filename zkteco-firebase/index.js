import express from 'express';
import morgan from 'morgan';
import config from './config.js';
import iclockRouter from './routes/iclock.js';
import { state } from './state.js';

const app = express();

// Initialise shared state from config (must be before any route handlers)
state.mode = config.syncMode;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(morgan('combined'));
app.use(express.text()); // ZKTeco ADMS sends plain-text bodies

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/iclock', iclockRouter);

/**
 * GET /health
 * Returns live server and device status.
 * deviceConnected:
 *   ADMS  — true if the device polled or posted within the last 2 minutes
 *   ZKLib — true if the TCP socket is currently open
 */
app.get('/health', (req, res) => {
  const now = Date.now();
  const uptimeSeconds = Math.floor((now - state.startTime) / 1000);

  let deviceConnected;
  if (state.mode === 'zklib') {
    deviceConnected = state.zkConnected;
  } else {
    // ADMS: consider connected if heard from in last 2 minutes
    deviceConnected = state.lastDeviceContact > 0 && now - state.lastDeviceContact < 120_000;
  }

  res.json({
    status: 'ok',
    mode: state.mode,
    deviceConnected,
    uptime: uptimeSeconds,
    timestamp: new Date(now).toISOString(),
    lastPunch: state.lastPunch,
  });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = config.port;
const server = app.listen(PORT, async () => {
  const modeLabel = config.syncMode === 'zklib' ? 'ZKLib (TCP pull)' : 'ADMS (HTTP push)';
  const deviceLine =
    config.syncMode === 'zklib'
      ? `  Device:           ${config.device.ip || '(DEVICE_IP not set)'}:${config.device.port}`
      : `  Device URL:       http://0.0.0.0:${PORT}/iclock/cdata`;

  console.log(`
╔══════════════════════════════════════════════╗
║      ZKTeco Firebase Attendance Sync         ║
╠══════════════════════════════════════════════╣
║  Sync mode:      ${modeLabel.padEnd(28)}║
║  Port:           ${String(PORT).padEnd(28)}║
${deviceLine.padEnd(47)}║
║  Firebase:       ${(config.firebase.projectId || '(not set)').padEnd(28)}║
║  Environment:    ${config.nodeEnv.padEnd(28)}║
╚══════════════════════════════════════════════╝`);

  if (config.syncMode === 'zklib') {
    // Dynamically import so ADMS-only deployments never load node-zklib
    const { startZKLibSync } = await import('./services/zklib.js');
    startZKLibSync();
  } else {
    console.log('Ready — waiting for ZKTeco device to push attendance data.\n');
  }
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n⚠ Received ${signal} — shutting down cleanly...`);

  if (config.syncMode === 'zklib') {
    try {
      const { stopZKLibSync } = await import('./services/zklib.js');
      stopZKLibSync();
      console.log('✓ ZKTeco device disconnected');
    } catch (_) {}
  }

  server.close(() => {
    console.log('✓ HTTP server closed');
    console.log('Server shutting down cleanly');
    process.exit(0);
  });

  // Force exit after 10 s if something hangs
  setTimeout(() => {
    console.error('✗ Forced exit after 10 s timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
