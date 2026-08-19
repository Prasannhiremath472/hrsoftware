const MockBiometricProvider = require('./providers/mockBiometricProvider');
const LocalDeviceProvider = require('./providers/localDeviceProvider');
const RdServiceProvider = require('./providers/rdServiceProvider');

function resolveProvider() {
  const mode = (process.env.BIOMETRIC_PROVIDER || 'mock').toLowerCase();
  // Aadhaar RD Service devices (Mantra MFS110 etc). Capture happens on the
  // client machine against 127.0.0.1; this provider records the result.
  if (mode === 'rdservice') return new RdServiceProvider();
  if (mode === 'vendor') return new LocalDeviceProvider();
  return new MockBiometricProvider();
}

// Resolved once per process; env is read at startup.
const provider = resolveProvider();

module.exports = {
  getDeviceStatus: (...args) => provider.getDeviceStatus(...args),
  capture: (...args) => provider.capture(...args),
  verify: (...args) => provider.verify(...args),
  providerName: (process.env.BIOMETRIC_PROVIDER || 'mock').toLowerCase(),
};
