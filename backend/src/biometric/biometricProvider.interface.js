/**
 * Biometric provider interface.
 *
 * Any concrete provider (mock, vendor SDK, local device agent) must implement:
 *
 *   getDeviceStatus(): Promise<{ connected: boolean, deviceName: string, provider: string }>
 *
 *   capture({ candidateId, hand }): Promise<{
 *     captureReference: string,   // opaque reference to the captured template — NEVER a raw image
 *     qualityScore: number,       // 0-100
 *     deviceInfo: string,
 *   }>
 *
 *   verify({ captureReference }): Promise<{ verified: boolean, confidence: number }>
 *
 * IMPORTANT: implementations must never persist or return raw fingerprint
 * images/templates — only an opaque capture_reference, a quality score,
 * and device metadata.
 */
class BiometricProviderInterface {
  // eslint-disable-next-line no-unused-vars
  async getDeviceStatus() {
    throw new Error('getDeviceStatus() not implemented');
  }

  // eslint-disable-next-line no-unused-vars
  async capture({ candidateId, hand }) {
    throw new Error('capture() not implemented');
  }

  // eslint-disable-next-line no-unused-vars
  async verify({ captureReference }) {
    throw new Error('verify() not implemented');
  }
}

module.exports = BiometricProviderInterface;
