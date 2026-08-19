/* eslint-disable no-console */
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const sdk = require('./mantraSdk');

/**
 * Local biometric agent.
 *
 * Runs on the operator's Windows PC, wraps Mantra's native SDK DLL, and exposes
 * it over localhost HTTP so the browser can trigger a capture. This exists
 * because a browser cannot load a DLL and a cloud-hosted backend cannot reach a
 * USB device on someone else's machine.
 *
 * SECURITY: binds to 127.0.0.1 only — never 0.0.0.0. This service can read
 * fingerprints, so it must not be reachable from the network. CORS is
 * restricted to the origins your web app is served from.
 */

const PORT = Number(process.env.AGENT_PORT) || 8891;
const HOST = '127.0.0.1'; // deliberately not configurable

// Origins allowed to call this agent (your web app). Comma-separated.
const ALLOWED_ORIGINS = (process.env.AGENT_ALLOWED_ORIGINS || 'http://localhost:5180,http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin/no-origin (curl, health checks) and configured origins.
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`Origin ${origin} is not allowed to use the biometric agent.`));
    },
  })
);

/** Agent + device status. The web app polls this to show scanner state. */
app.get('/status', (req, res) => {
  const sdkPresent = sdk.isSdkAvailable();
  if (!sdkPresent) {
    return res.json({
      agent: 'running',
      sdkAvailable: false,
      deviceReady: false,
      message: `Mantra SDK not found at ${sdk.DLL_PATH}. Install the SDK and set MANTRA_DLL_PATH.`,
    });
  }

  try {
    const info = sdk.getDeviceInfo();
    return res.json({
      agent: 'running',
      sdkAvailable: true,
      deviceReady: true,
      deviceInfo: info.raw,
    });
  } catch (err) {
    return res.json({
      agent: 'running',
      sdkAvailable: true,
      deviceReady: false,
      message: err.message,
    });
  }
});

/**
 * Captures a fingerprint and returns its template.
 * The image is NOT returned by default — templates are what get stored, and
 * shipping raw images around needlessly widens exposure.
 */
app.post('/capture', async (req, res) => {
  const timeoutMs = Number(req.body?.timeoutMs) || 20000;
  const minQuality = Number(req.body?.minQuality) || 60;

  try {
    const result = sdk.capture({ timeoutMs, minQuality, includeImage: false });
    return res.json({
      success: true,
      template: result.template,
      templateFormat: process.env.MANTRA_TEMPLATE_FORMAT || 'ISO_19794_2',
      qualityScore: result.qualityScore,
      deviceInfo: (() => {
        try {
          return sdk.getDeviceInfo().raw;
        } catch {
          return null;
        }
      })(),
      sdkVersion: process.env.MANTRA_SDK_VERSION || null,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * Optional local 1:1 match, using the SDK's own matcher.
 * Server-side matching is the primary path, but this is useful for a quick
 * "is this the same finger?" check without a round trip.
 */
app.post('/match', (req, res) => {
  const { templateA, templateB } = req.body || {};
  if (!templateA || !templateB) {
    return res.status(400).json({ success: false, message: 'templateA and templateB are required.' });
  }
  try {
    const score = sdk.matchTemplates(templateA, templateB);
    return res.json({ success: true, score });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

const server = app.listen(PORT, HOST, () => {
  console.log(`Biometric agent listening on http://${HOST}:${PORT}`);
  console.log(`SDK: ${sdk.isSdkAvailable() ? sdk.DLL_PATH : 'NOT FOUND — set MANTRA_DLL_PATH'}`);
  console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});

// Release the device cleanly so the next run can open it.
function shutdown() {
  console.log('Shutting down biometric agent…');
  try {
    sdk.uninit();
  } catch {
    /* device may not have been opened */
  }
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
