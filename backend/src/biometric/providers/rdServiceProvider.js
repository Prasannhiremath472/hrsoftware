const crypto = require('crypto');
const BiometricProviderInterface = require('../biometricProvider.interface');

/**
 * Mantra MFS110 (and any Aadhaar RD Service device) provider.
 *
 * ARCHITECTURE — read before changing this file:
 *
 * An RD Service scanner is a USB device whose driver runs on the OPERATOR'S
 * machine and exposes a local HTTP service on 127.0.0.1 (ports ~11100-11120)
 * speaking the RDSERVICE/CAPTURE verbs. A cloud-hosted backend physically
 * cannot reach that loopback address on someone else's computer, so the
 * capture itself is performed CLIENT-SIDE (see frontend/src/lib/rdService.ts
 * and the mobile equivalent). The client posts the capture RESULT here.
 *
 * This provider therefore does not talk to hardware. Its job is to validate
 * and normalise a client-supplied capture into a storable proof-of-capture
 * record. That is a deliberate design choice, not a limitation to "fix" by
 * having the server call 127.0.0.1 — doing so would only ever reach the
 * server's own loopback.
 *
 * WHAT IS STORED (and what is deliberately NOT):
 *   - stored: SHA-256 hash of the PID block, quality score, device serial,
 *     RD Service version, timestamp.
 *   - NOT stored: the PID block itself, any biometric template, any image.
 * RD Service encrypts the PID payload by design so applications cannot
 * retain usable biometrics; retaining PID blocks is additionally regulated
 * under the Aadhaar Act and requires an AUA/KUA licence. The hash below is
 * one-way and is only evidence that a capture occurred on a given device —
 * it cannot be reversed into a fingerprint.
 */
class RdServiceProvider extends BiometricProviderInterface {
  /**
   * Device connectivity is only observable from the client machine, so the
   * server reports the provider mode and defers the live status to the
   * client's own RDSERVICE probe.
   */
  async getDeviceStatus() {
    return {
      connected: false,
      deviceName: 'Mantra MFS110 (RD Service — status determined on client)',
      provider: 'rdservice',
      clientDetermined: true,
    };
  }

  /**
   * Normalises a client-side RD Service capture into a proof-of-capture record.
   *
   * @param {object} args
   * @param {number|string} args.candidateId
   * @param {string} args.hand LEFT_HAND | RIGHT_HAND
   * @param {object} args.clientCapture Result relayed from the client's RD Service call.
   * @param {string} args.clientCapture.pidBlock Encrypted PID XML — hashed, never stored.
   * @param {number} args.clientCapture.qualityScore 0-100, from the CAPTURE response.
   * @param {string} [args.clientCapture.deviceSerial]
   * @param {string} [args.clientCapture.deviceModel]
   * @param {string} [args.clientCapture.rdsVersion]
   * @param {number} [args.clientCapture.errorCode] RD Service errCode; 0 means success.
   * @param {string} [args.clientCapture.errorInfo]
   */
  async capture({ candidateId, hand, clientCapture }) {
    if (!clientCapture || typeof clientCapture !== 'object') {
      throw new Error(
        'A client-side RD Service capture is required. The browser/app must call the local RD Service and relay the result — the server cannot reach the USB device directly.'
      );
    }

    const { pidBlock, qualityScore, deviceSerial, deviceModel, rdsVersion, errorCode, errorInfo } = clientCapture;

    // RD Service reports failures in-band with errCode !== 0 (e.g. 700 = capture
    // timeout, 730 = device not ready). Surface these rather than storing a
    // record for a capture that never actually succeeded.
    if (errorCode !== undefined && Number(errorCode) !== 0) {
      throw new Error(`RD Service capture failed (errCode ${errorCode}): ${errorInfo || 'unknown error'}`);
    }

    if (!pidBlock || typeof pidBlock !== 'string' || pidBlock.trim().length === 0) {
      throw new Error('RD Service capture did not return a PID block — the fingerprint was not captured.');
    }

    const score = Number(qualityScore);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      throw new Error('RD Service capture did not return a valid quality score (expected 0-100).');
    }

    // One-way hash: proves this exact capture happened without retaining the
    // biometric payload. Salted with candidate+hand so identical PID blocks
    // (which should never occur) still produce distinct references.
    const captureReference = crypto
      .createHash('sha256')
      .update(`${candidateId}:${hand}:${pidBlock}`)
      .digest('hex');

    const deviceInfo = [
      deviceModel || 'Mantra MFS110',
      deviceSerial ? `SN:${deviceSerial}` : null,
      rdsVersion ? `RDS:${rdsVersion}` : null,
    ]
      .filter(Boolean)
      .join(' ');

    return {
      captureReference,
      qualityScore: Math.round(score * 100) / 100,
      deviceInfo,
    };
  }

  /**
   * A stored capture reference is a one-way hash, so the server cannot
   * re-run a biometric match against it. "Verified" here means the recorded
   * capture is well-formed and originated from this provider — a genuine
   * 1:1 biometric match would require sending a fresh PID block to a
   * licensed AUA/KUA auth API, which this system deliberately does not do.
   */
  async verify({ captureReference }) {
    const looksValid = typeof captureReference === 'string' && /^[a-f0-9]{64}$/.test(captureReference);
    return {
      verified: looksValid,
      confidence: looksValid ? 100 : 0,
      note: 'Capture-record integrity check only; not a 1:1 biometric match.',
    };
  }
}

module.exports = RdServiceProvider;
