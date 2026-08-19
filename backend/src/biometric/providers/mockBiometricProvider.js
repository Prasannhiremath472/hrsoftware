const { v4: uuidv4 } = require('uuid');
const BiometricProviderInterface = require('../biometricProvider.interface');

/**
 * Fully functional mock biometric provider for dev/demo use.
 * Simulates a fingerprint scanner: generates a plausible quality score
 * and an opaque capture reference so the whole onboarding workflow can
 * complete end-to-end without any real hardware/SDK.
 *
 * THIS IS NOT A REAL BIOMETRIC CAPTURE. Do not use in production for
 * actual identity verification — wire a real vendor SDK via
 * BIOMETRIC_PROVIDER=vendor and localDeviceProvider.js / a vendor adapter.
 */
class MockBiometricProvider extends BiometricProviderInterface {
  async getDeviceStatus() {
    return {
      connected: true,
      deviceName: 'Mock Fingerprint Scanner (Simulated)',
      provider: 'mock',
    };
  }

  async capture({ candidateId, hand }) {
    // Simulate realistic capture latency
    await new Promise((resolve) => setTimeout(resolve, 400));

    const qualityScore = Math.round((70 + Math.random() * 30) * 100) / 100; // 70.00 - 100.00
    const captureReference = `MOCK-${hand}-${candidateId}-${uuidv4()}`;

    return {
      captureReference,
      qualityScore,
      deviceInfo: 'Mock Scanner v1.0 (software simulation)',
    };
  }

  async verify({ captureReference }) {
    if (!captureReference || !captureReference.startsWith('MOCK-')) {
      return { verified: false, confidence: 0 };
    }
    return { verified: true, confidence: Math.round((85 + Math.random() * 15) * 100) / 100 };
  }
}

module.exports = MockBiometricProvider;
