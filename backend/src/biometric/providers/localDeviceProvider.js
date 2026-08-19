const BiometricProviderInterface = require('../biometricProvider.interface');

/**
 * Stub for a real local fingerprint-device / vendor SDK integration
 * (e.g. Mantra, Morpho, SecuGen, or a Windows Biometric Framework agent).
 *
 * This is intentionally NOT implemented — wiring a real device requires
 * vendor-specific native drivers/SDKs that are out of scope for this
 * codebase. Selecting BIOMETRIC_PROVIDER=vendor will use this class and
 * every method will throw until a real integration is implemented here.
 *
 * To integrate a real device:
 *   1. Install the vendor SDK / native driver on the host machine.
 *   2. Implement getDeviceStatus() to query the device/agent for connectivity.
 *   3. Implement capture() to invoke the SDK, obtain a template reference
 *      (NEVER a raw image) and a quality score, and return them.
 *   4. Implement verify() to call the SDK's match/verify API.
 */
class LocalDeviceProvider extends BiometricProviderInterface {
  async getDeviceStatus() {
    return {
      connected: false,
      deviceName: 'No vendor device configured',
      provider: 'vendor',
    };
  }

  async capture() {
    throw new Error(
      'LocalDeviceProvider.capture() is not implemented. Configure a real vendor SDK integration or set BIOMETRIC_PROVIDER=mock for development.'
    );
  }

  async verify() {
    throw new Error(
      'LocalDeviceProvider.verify() is not implemented. Configure a real vendor SDK integration or set BIOMETRIC_PROVIDER=mock for development.'
    );
  }
}

module.exports = LocalDeviceProvider;
