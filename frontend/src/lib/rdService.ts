/**
 * Aadhaar RD Service client (Mantra MFS110 and compatible devices).
 *
 * WHY THIS RUNS IN THE BROWSER, NOT THE BACKEND:
 * An RD Service scanner's driver runs on the operator's own machine and
 * exposes a local HTTP service on 127.0.0.1. A cloud-hosted backend cannot
 * reach that loopback address on a different computer, so discovery and
 * capture must happen here, on the machine the device is plugged into. Only
 * the capture *result* is sent to the server, which stores a one-way hash of
 * it (never the biometric payload itself).
 *
 * PROTOCOL NOTES:
 * RD Service uses non-standard HTTP verbs (RDSERVICE, CAPTURE) and responds
 * with XML. Devices bind to a port in a small range and the exact port
 * varies per install/boot, so we probe the range to discover it.
 */

/** Ports Mantra/other RD Services are known to bind within. */
const RD_PORT_RANGE_START = 11100;
const RD_PORT_RANGE_END = 11120;
const DISCOVERY_TIMEOUT_MS = 1200;
const CAPTURE_TIMEOUT_MS = 30000;

export interface RdDeviceInfo {
  /** Base URL of the discovered local RD Service, e.g. http://127.0.0.1:11100 */
  baseUrl: string;
  /** RD Service status: READY means a device is connected and usable. */
  status: string;
  /** Human-readable provider/model info reported by the service. */
  info: string;
  rdsVersion?: string;
  deviceSerial?: string;
}

export interface RdCaptureResult {
  pidBlock: string;
  qualityScore: number;
  deviceSerial?: string;
  deviceModel?: string;
  rdsVersion?: string;
  errorCode: number;
  errorInfo?: string;
}

export class RdServiceError extends Error {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'RdServiceError';
    this.code = code;
  }
}

function parseXml(text: string): Document {
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  if (doc.querySelector('parsererror')) {
    throw new RdServiceError('RD Service returned a malformed XML response.', 'BAD_XML');
  }
  return doc;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Probes the local port range for a running RD Service.
 * Returns the first service reporting a connected device, else throws.
 */
export async function discoverDevice(): Promise<RdDeviceInfo> {
  const attempts: Promise<RdDeviceInfo | null>[] = [];

  for (let port = RD_PORT_RANGE_START; port <= RD_PORT_RANGE_END; port += 1) {
    const baseUrl = `http://127.0.0.1:${port}`;
    attempts.push(
      (async () => {
        try {
          const res = await fetchWithTimeout(baseUrl, { method: 'RDSERVICE' }, DISCOVERY_TIMEOUT_MS);
          if (!res.ok) return null;
          const doc = parseXml(await res.text());
          const root = doc.querySelector('RDService');
          if (!root) return null;
          return {
            baseUrl,
            status: root.getAttribute('status') ?? 'UNKNOWN',
            info: root.getAttribute('info') ?? '',
            rdsVersion: doc.querySelector('RDVersion')?.textContent ?? undefined,
            deviceSerial: doc.querySelector('Interface[id="DEVICEINFO"]')?.getAttribute('path') ?? undefined,
          };
        } catch {
          // Port closed / not an RD Service / blocked — expected for most ports.
          return null;
        }
      })()
    );
  }

  const results = (await Promise.all(attempts)).filter((r): r is RdDeviceInfo => r !== null);

  if (results.length === 0) {
    throw new RdServiceError(
      'No RD Service found on this computer. Make sure the Mantra MFS110 is plugged in and the Mantra RD Service is installed and running.',
      'NOT_FOUND'
    );
  }

  const ready = results.find((r) => r.status.toUpperCase() === 'READY');
  if (!ready) {
    throw new RdServiceError(
      `RD Service is running but no device is ready (status: ${results[0].status}). Check that the scanner is connected.`,
      'NOT_READY'
    );
  }
  return ready;
}

/**
 * PID options requested from the device. fType=0 requests the fingerprint
 * PID; fCount=1 captures a single finger. pidVer/timeout follow the RD
 * Service spec. This never requests a raw image — RD Service only ever
 * returns an encrypted PID block.
 */
function buildPidOptions(timeoutMs: number): string {
  return [
    '<?xml version="1.0"?>',
    '<PidOptions ver="1.0">',
    `<Opts fCount="1" fType="0" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="${timeoutMs}" posh="UNKNOWN" env="P" />`,
    '</PidOptions>',
  ].join('');
}

/**
 * Triggers a fingerprint capture on the local device.
 * Resolves with the encrypted PID block plus quality/device metadata.
 */
export async function captureFingerprint(device: RdDeviceInfo): Promise<RdCaptureResult> {
  let res: Response;
  try {
    res = await fetchWithTimeout(
      `${device.baseUrl}/rd/capture`,
      {
        method: 'CAPTURE',
        headers: { 'Content-Type': 'text/xml' },
        body: buildPidOptions(CAPTURE_TIMEOUT_MS),
      },
      CAPTURE_TIMEOUT_MS + 5000
    );
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new RdServiceError('The fingerprint capture timed out. Please try again.', 'TIMEOUT');
    }
    throw new RdServiceError('Could not reach the RD Service to capture a fingerprint.', 'UNREACHABLE');
  }

  const doc = parseXml(await res.text());
  const resp = doc.querySelector('Resp');
  if (!resp) {
    throw new RdServiceError('RD Service returned an unexpected capture response.', 'BAD_RESPONSE');
  }

  const errorCode = Number(resp.getAttribute('errCode') ?? '-1');
  const errorInfo = resp.getAttribute('errInfo') ?? undefined;

  if (errorCode !== 0) {
    throw new RdServiceError(
      `Fingerprint capture failed (code ${errorCode}): ${errorInfo || 'unknown error'}`,
      `RD_${errorCode}`
    );
  }

  // qScore is the device-reported capture quality (0-100).
  const qualityScore = Number(resp.getAttribute('qScore') ?? '0');

  // The <Data> element holds the encrypted PID block. It is sent to the
  // server only to be hashed — the server never stores it.
  const pidBlock = doc.querySelector('Data')?.textContent?.trim() ?? '';
  if (!pidBlock) {
    throw new RdServiceError('Capture succeeded but returned no PID data.', 'NO_PID');
  }

  const deviceInfoEl = doc.querySelector('DeviceInfo');

  return {
    pidBlock,
    qualityScore,
    deviceSerial: deviceInfoEl?.getAttribute('srno') ?? device.deviceSerial,
    deviceModel: deviceInfoEl?.getAttribute('mi') ?? 'MFS110',
    rdsVersion: deviceInfoEl?.getAttribute('rdsVer') ?? device.rdsVersion,
    errorCode,
    errorInfo,
  };
}
