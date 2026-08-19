process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_automated_tests_only';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.BIOMETRIC_PROVIDER = 'mock';
process.env.KYC_PROVIDER = 'manual';
process.env.MAX_FILE_SIZE_MB = '10';
process.env.UPLOAD_DIR = 'storage_test';

jest.mock('../src/db/pool', () => {
  const { fakePool, withTransaction } = require('./testDb');
  return { pool: fakePool, withTransaction };
});

// Capture outgoing OTP emails in tests instead of requiring real SMTP.
// otpService always goes through mailer.sendMail — mocking it here lets
// tests read the OTP code straight out of the mocked call args.
jest.mock('../src/services/mailer', () => ({
  sendMail: jest.fn().mockResolvedValue({ delivered: false, devFallback: true }),
  isConfigured: () => false,
}));
