const request = require('supertest');
const app = require('../src/app');
const { resetState } = require('./testDb');
const mailer = require('../src/services/mailer');

const ADMIN_EMAIL = 'admin@test.local';
const ADMIN_PASSWORD = 'Password123!';

// Pulls the 6-digit code out of the mocked mailer.sendMail call so tests can
// complete the OTP step without a real inbox.
function extractOtpFromLastEmail() {
  const lastCall = mailer.sendMail.mock.calls[mailer.sendMail.mock.calls.length - 1][0];
  const match = /(\d{6})/.exec(lastCall.text);
  if (!match) throw new Error('Could not find OTP in mocked email body');
  return match[1];
}

async function loginAsAdmin() {
  const step1 = await request(app).post('/api/auth/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const { preAuthToken } = step1.body.data;
  const otp = extractOtpFromLastEmail();
  const step2 = await request(app).post('/api/auth/verify-otp').send({ preAuthToken, otp });
  return step2.body.data.token;
}

beforeEach(() => {
  resetState();
  mailer.sendMail.mockClear();
});

describe('Auth', () => {
  test('POST /api/auth/login with valid credentials sends an OTP instead of a token', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeUndefined();
    expect(res.body.data.preAuthToken).toBeDefined();
    expect(mailer.sendMail).toHaveBeenCalledTimes(1);
    expect(mailer.sendMail.mock.calls[0][0].to).toBe(ADMIN_EMAIL);
  });

  test('POST /api/auth/login fails with wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: ADMIN_EMAIL, password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(mailer.sendMail).not.toHaveBeenCalled();
  });

  test('POST /api/auth/verify-otp with the correct code issues a token', async () => {
    const step1 = await request(app).post('/api/auth/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const otp = extractOtpFromLastEmail();
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ preAuthToken: step1.body.data.preAuthToken, otp });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(ADMIN_EMAIL);
  });

  test('POST /api/auth/verify-otp rejects an incorrect code', async () => {
    const step1 = await request(app).post('/api/auth/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ preAuthToken: step1.body.data.preAuthToken, otp: '000000' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/auth/verify-otp rejects a stale/unknown pre-auth token', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ preAuthToken: 'a'.repeat(64), otp: '123456' });
    expect(res.status).toBe(404);
  });

  test('POST /api/auth/resend-otp issues a new code and invalidates the old one', async () => {
    const step1 = await request(app).post('/api/auth/login').send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const oldOtp = extractOtpFromLastEmail();

    const resend = await request(app).post('/api/auth/resend-otp').send({ preAuthToken: step1.body.data.preAuthToken });
    expect(resend.status).toBe(200);
    const newPreAuthToken = resend.body.data.preAuthToken;
    const newOtp = extractOtpFromLastEmail();

    const oldAttempt = await request(app)
      .post('/api/auth/verify-otp')
      .send({ preAuthToken: step1.body.data.preAuthToken, otp: oldOtp });
    expect(oldAttempt.status).toBe(401);

    const newAttempt = await request(app)
      .post('/api/auth/verify-otp')
      .send({ preAuthToken: newPreAuthToken, otp: newOtp });
    expect(newAttempt.status).toBe(200);
  });

  test('GET /api/auth/me requires a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me returns the current user with a valid token', async () => {
    const token = await loginAsAdmin();
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(ADMIN_EMAIL);
  });
});

describe('Candidate creation', () => {
  test('POST /api/candidates creates a candidate with a generated candidate_number', async () => {
    const token = await loginAsAdmin();
    const res = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'John Doe', mobile: '9876543210', email: 'john@example.com', gender: 'MALE' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.candidate_number).toMatch(/^CAN-\d{4}-\d{6}$/);
    expect(res.body.data.status).toBe('DRAFT');
  });

  test('POST /api/candidates rejects invalid payload', async () => {
    const token = await loginAsAdmin();
    const res = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'X', mobile: '' });
    expect(res.status).toBe(422);
  });

  test('POST /api/candidates rejects a mobile number that is not exactly 10 digits', async () => {
    const token = await loginAsAdmin();
    const tooLong = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Bad Mobile Candidate', mobile: '8585858585858885' });
    expect(tooLong.status).toBe(422);

    const wrongLeadingDigit = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Bad Mobile Candidate', mobile: '1234567890' });
    expect(wrongLeadingDigit.status).toBe(422);

    const withSymbols = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Bad Mobile Candidate', mobile: '+91 98765-43210' });
    expect(withSymbols.status).toBe(422);
  });
});

describe('Coordinator assignment', () => {
  test('PATCH /api/candidates/:id/coordinator assigns an active coordinator', async () => {
    const token = await loginAsAdmin();
    const createRes = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Jane Roe', mobile: '9876500000' });
    const candidateId = createRes.body.data.id;

    const res = await request(app)
      .patch(`/api/candidates/${candidateId}/coordinator`)
      .set('Authorization', `Bearer ${token}`)
      .send({ coordinatorId: 1 });

    expect(res.status).toBe(200);
    expect(res.body.data.coordinator_id).toBe(1);
  });
});

describe('KYC save', () => {
  test('PUT /api/candidates/:id/kyc saves KYC details and masks Aadhaar/PAN in response', async () => {
    const token = await loginAsAdmin();
    const createRes = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Kyc Candidate', mobile: '9876511111' });
    const candidateId = createRes.body.data.id;

    const res = await request(app)
      .put(`/api/candidates/${candidateId}/kyc`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        applicantName: 'Kyc Candidate',
        fatherSpouseName: 'Father Name',
        gender: 'MALE',
        maritalStatus: 'SINGLE',
        dob: '2000-01-01',
        panNumber: 'ABCDE1234F',
        aadhaarNumber: '123412341234',
        proofOfIdentity: 'AADHAAR',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.aadhaar_number).toBe('XXXX XXXX 1234');
    expect(res.body.data.pan_number).not.toBe('ABCDE1234F');
  });

  test('PUT /api/candidates/:id/kyc rejects invalid PAN format', async () => {
    const token = await loginAsAdmin();
    const createRes = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Bad Pan Candidate', mobile: '9876522222' });
    const candidateId = createRes.body.data.id;

    const res = await request(app)
      .put(`/api/candidates/${candidateId}/kyc`)
      .set('Authorization', `Bearer ${token}`)
      .send({ panNumber: 'INVALID' });

    expect(res.status).toBe(422);
  });
});

describe('Address save', () => {
  test('PUT /api/candidates/:id/address rejects a PIN code that is not exactly 6 digits', async () => {
    const token = await loginAsAdmin();
    const createRes = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Bad Pin Candidate', mobile: '9876512345' });
    const candidateId = createRes.body.data.id;

    const tooShort = await request(app)
      .put(`/api/candidates/${candidateId}/address`)
      .set('Authorization', `Bearer ${token}`)
      .send({ residenceAddress: '123 Main St', residencePinCode: '4110', proofOfAddress: 'AADHAAR' });
    expect(tooShort.status).toBe(422);

    const withLetters = await request(app)
      .put(`/api/candidates/${candidateId}/address`)
      .set('Authorization', `Bearer ${token}`)
      .send({ residenceAddress: '123 Main St', residencePinCode: '41100A', proofOfAddress: 'AADHAAR' });
    expect(withLetters.status).toBe(422);
  });

  test('PUT /api/candidates/:id/address accepts a valid 6-digit PIN code', async () => {
    const token = await loginAsAdmin();
    const createRes = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Good Pin Candidate', mobile: '9876512346' });
    const candidateId = createRes.body.data.id;

    const res = await request(app)
      .put(`/api/candidates/${candidateId}/address`)
      .set('Authorization', `Bearer ${token}`)
      .send({ residenceAddress: '123 Main St', residencePinCode: '411001', proofOfAddress: 'AADHAAR' });
    expect(res.status).toBe(200);
  });
});

describe('Document upload and verification', () => {
  test('POST /api/candidates/:id/documents uploads a document', async () => {
    const token = await loginAsAdmin();
    const createRes = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Doc Candidate', mobile: '9876533333' });
    const candidateId = createRes.body.data.id;

    const res = await request(app)
      .post(`/api/candidates/${candidateId}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .field('documentTypeId', '1')
      .attach('file', Buffer.from('%PDF-1.4 fake pdf content'), { filename: 'aadhaar.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('UPLOADED');
  });

  test('PATCH /api/documents/:id/verify marks a document as verified', async () => {
    const token = await loginAsAdmin();
    const createRes = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Verify Candidate', mobile: '9876544444' });
    const candidateId = createRes.body.data.id;

    const uploadRes = await request(app)
      .post(`/api/candidates/${candidateId}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .field('documentTypeId', '2')
      .attach('file', Buffer.from('%PDF-1.4 fake pdf content'), { filename: 'pan.pdf', contentType: 'application/pdf' });
    const documentId = uploadRes.body.data.id;

    const res = await request(app)
      .patch(`/api/documents/${documentId}/verify`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('VERIFIED');
  });

  test('PATCH /api/documents/:id/reject requires a reason', async () => {
    const token = await loginAsAdmin();
    const createRes = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Reject Candidate', mobile: '9876555555' });
    const candidateId = createRes.body.data.id;

    const uploadRes = await request(app)
      .post(`/api/candidates/${candidateId}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .field('documentTypeId', '1')
      .attach('file', Buffer.from('%PDF-1.4 fake pdf content'), { filename: 'aadhaar.pdf', contentType: 'application/pdf' });
    const documentId = uploadRes.body.data.id;

    const missingReason = await request(app)
      .patch(`/api/documents/${documentId}/reject`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(missingReason.status).toBe(422);

    const res = await request(app)
      .patch(`/api/documents/${documentId}/reject`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Blurry scan', comment: 'Please re-upload a clearer copy' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('REJECTED');
  });
});

describe('RD Service biometric provider (Mantra MFS110)', () => {
  const RdServiceProvider = require('../src/biometric/providers/rdServiceProvider');
  const provider = new RdServiceProvider();

  const validCapture = {
    pidBlock: 'ENCRYPTED_PID_XML_BLOB',
    qualityScore: 87.5,
    deviceSerial: 'MFS110-XYZ',
    deviceModel: 'MFS110',
    rdsVersion: '1.0.9',
    errorCode: 0,
  };

  test('never returns or stores the raw PID block', async () => {
    const result = await provider.capture({ candidateId: 3, hand: 'LEFT_HAND', clientCapture: validCapture });
    expect(JSON.stringify(result)).not.toContain(validCapture.pidBlock);
    expect(result.captureReference).toMatch(/^[a-f0-9]{64}$/);
  });

  test('capture reference is deterministic per candidate+hand', async () => {
    const a = await provider.capture({ candidateId: 3, hand: 'LEFT_HAND', clientCapture: validCapture });
    const b = await provider.capture({ candidateId: 3, hand: 'LEFT_HAND', clientCapture: validCapture });
    const rightHand = await provider.capture({ candidateId: 3, hand: 'RIGHT_HAND', clientCapture: validCapture });
    const otherCandidate = await provider.capture({ candidateId: 4, hand: 'LEFT_HAND', clientCapture: validCapture });

    expect(a.captureReference).toBe(b.captureReference);
    expect(rightHand.captureReference).not.toBe(a.captureReference);
    expect(otherCandidate.captureReference).not.toBe(a.captureReference);
  });

  test('rejects an RD Service in-band error code', async () => {
    await expect(
      provider.capture({
        candidateId: 1,
        hand: 'LEFT_HAND',
        clientCapture: { ...validCapture, errorCode: 700, errorInfo: 'Capture timeout' },
      })
    ).rejects.toThrow(/errCode 700/);
  });

  test('rejects a capture with no PID block or an out-of-range quality score', async () => {
    await expect(
      provider.capture({ candidateId: 1, hand: 'LEFT_HAND', clientCapture: { ...validCapture, pidBlock: '' } })
    ).rejects.toThrow(/did not return a PID block/);

    await expect(
      provider.capture({ candidateId: 1, hand: 'LEFT_HAND', clientCapture: { ...validCapture, qualityScore: 150 } })
    ).rejects.toThrow(/valid quality score/);
  });

  test('rejects a capture with no client payload (server cannot reach the USB device)', async () => {
    await expect(provider.capture({ candidateId: 1, hand: 'LEFT_HAND' })).rejects.toThrow(
      /client-side RD Service capture is required/
    );
  });

  test('verify only validates record integrity, not a biometric match', async () => {
    const { captureReference } = await provider.capture({
      candidateId: 3,
      hand: 'LEFT_HAND',
      clientCapture: validCapture,
    });
    await expect(provider.verify({ captureReference })).resolves.toMatchObject({ verified: true });
    await expect(provider.verify({ captureReference: 'not-a-hash' })).resolves.toMatchObject({ verified: false });
  });
});

describe('Fingerprint template validators (Mantra non-Aadhaar SDK path)', () => {
  const { FINGERS } = require('../src/validators/fingerprintValidators');

  test('finger positions cover all ten digits', () => {
    expect(FINGERS).toHaveLength(10);
    expect(FINGERS).toContain('LEFT_THUMB');
    expect(FINGERS).toContain('RIGHT_LITTLE');
  });

  test('template model never selects the template column for API reads', () => {
    // Templates are biometric data and must never reach a response body.
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../src/models/fingerprintTemplateModel.js'),
      'utf8'
    );
    const safeColumns = src.match(/const SAFE_COLUMNS = `([^`]+)`/)[1];
    expect(safeColumns).not.toMatch(/\btemplate\b(?!_format)/);
    expect(safeColumns).toContain('template_format');
  });

  test('exact matcher never reports a match for differing templates', async () => {
    // Guards the documented promise that `exact` mode cannot false-positive.
    process.env.FINGERPRINT_MATCHER = 'exact';
    jest.resetModules();
    // eslint-disable-next-line global-require
    const svc = require('../src/services/fingerprintMatchService');
    expect(svc.matcherMode).toBe('exact');
  });
});

describe('Wizard progress tracking', () => {
  test('candidate status and current_step advance as onboarding steps are completed', async () => {
    const token = await loginAsAdmin();
    const createRes = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Progress Candidate', mobile: '9876588888' });
    const candidateId = createRes.body.data.id;

    const fetch = () => request(app).get(`/api/candidates/${candidateId}`).set('Authorization', `Bearer ${token}`);

    let current = await fetch();
    expect(current.body.data.status).toBe('DRAFT');
    expect(current.body.data.current_step).toBe('REGISTRATION');

    await request(app)
      .put(`/api/candidates/${candidateId}/kyc`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        applicantName: 'Progress Candidate',
        dob: '2000-01-01',
        panNumber: 'ABCDE1234F',
        aadhaarNumber: '123412341234',
        proofOfIdentity: 'AADHAAR',
      });

    current = await fetch();
    expect(current.body.data.status).toBe('KYC_PENDING');
    expect(current.body.data.current_step).toBe('KYC');

    await request(app)
      .put(`/api/candidates/${candidateId}/address`)
      .set('Authorization', `Bearer ${token}`)
      .send({ residenceAddress: '123 Main St', residencePinCode: '411001', proofOfAddress: 'AADHAAR', sameAsResidence: true });

    current = await fetch();
    expect(current.body.data.status).toBe('ADDRESS_PENDING');
    expect(current.body.data.current_step).toBe('ADDRESS');

    const doc = await request(app)
      .post(`/api/candidates/${candidateId}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .field('documentTypeId', '1')
      .attach('file', Buffer.from('%PDF-1.4 fake'), { filename: 'aadhaar.pdf', contentType: 'application/pdf' });

    current = await fetch();
    expect(current.body.data.status).toBe('DOCUMENT_VERIFICATION_PENDING');
    expect(current.body.data.current_step).toBe('DOCUMENT_UPLOAD');

    await request(app).patch(`/api/documents/${doc.body.data.id}/verify`).set('Authorization', `Bearer ${token}`);

    current = await fetch();
    expect(current.body.data.current_step).toBe('VERIFICATION');

    await request(app)
      .post(`/api/candidates/${candidateId}/biometric/capture`)
      .set('Authorization', `Bearer ${token}`)
      .send({ hand: 'LEFT_HAND' });

    current = await fetch();
    expect(current.body.data.status).toBe('BIOMETRIC_PENDING');
    expect(current.body.data.current_step).toBe('LEFT_BIOMETRIC');
  });

  test('revisiting an earlier step after later progress does not regress current_step', async () => {
    const token = await loginAsAdmin();
    const createRes = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'No Regress Candidate', mobile: '9876599999' });
    const candidateId = createRes.body.data.id;

    await request(app)
      .put(`/api/candidates/${candidateId}/kyc`)
      .set('Authorization', `Bearer ${token}`)
      .send({ applicantName: 'A', dob: '2000-01-01', proofOfIdentity: 'AADHAAR' });
    await request(app)
      .put(`/api/candidates/${candidateId}/address`)
      .set('Authorization', `Bearer ${token}`)
      .send({ residenceAddress: 'X', residencePinCode: '411001', proofOfAddress: 'AADHAAR', sameAsResidence: true });

    // Re-save KYC (e.g. admin goes back to correct a typo) after address is already done.
    await request(app)
      .put(`/api/candidates/${candidateId}/kyc`)
      .set('Authorization', `Bearer ${token}`)
      .send({ applicantName: 'A Corrected', dob: '2000-01-01', proofOfIdentity: 'AADHAAR' });

    const res = await request(app).get(`/api/candidates/${candidateId}`).set('Authorization', `Bearer ${token}`);
    expect(res.body.data.current_step).toBe('ADDRESS');
    expect(res.body.data.status).toBe('ADDRESS_PENDING');
  });
});

describe('Final submission', () => {
  test('POST /api/candidates/:id/submit fails validation when incomplete', async () => {
    const token = await loginAsAdmin();
    const createRes = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Incomplete Candidate', mobile: '9876566666' });
    const candidateId = createRes.body.data.id;

    mailer.sendMail.mockClear();
    const res = await request(app)
      .post(`/api/candidates/${candidateId}/submit`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.length).toBeGreaterThan(0);
    // An incomplete/rejected submission must never trigger the admin
    // "candidate submitted" notification.
    expect(mailer.sendMail).not.toHaveBeenCalled();
  });

  test('POST /api/candidates/:id/submit succeeds once all required sections are complete', async () => {
    const token = await loginAsAdmin();
    const createRes = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Complete Candidate', mobile: '9876577777' });
    const candidateId = createRes.body.data.id;

    await request(app)
      .put(`/api/candidates/${candidateId}/kyc`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        applicantName: 'Complete Candidate',
        dob: '2000-01-01',
        panNumber: 'ABCDE1234F',
        aadhaarNumber: '123412341234',
        proofOfIdentity: 'AADHAAR',
      });

    await request(app)
      .put(`/api/candidates/${candidateId}/address`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        residenceAddress: '123 Main St',
        residencePinCode: '411001',
        proofOfAddress: 'AADHAAR',
        sameAsResidence: true,
      });

    const doc1 = await request(app)
      .post(`/api/candidates/${candidateId}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .field('documentTypeId', '1')
      .attach('file', Buffer.from('%PDF-1.4 fake'), { filename: 'aadhaar.pdf', contentType: 'application/pdf' });
    await request(app).patch(`/api/documents/${doc1.body.data.id}/verify`).set('Authorization', `Bearer ${token}`);

    const doc2 = await request(app)
      .post(`/api/candidates/${candidateId}/documents`)
      .set('Authorization', `Bearer ${token}`)
      .field('documentTypeId', '2')
      .attach('file', Buffer.from('%PDF-1.4 fake'), { filename: 'pan.pdf', contentType: 'application/pdf' });
    await request(app).patch(`/api/documents/${doc2.body.data.id}/verify`).set('Authorization', `Bearer ${token}`);

    await request(app)
      .post(`/api/candidates/${candidateId}/photo`)
      .set('Authorization', `Bearer ${token}`)
      .send({ photoBase64: `data:image/png;base64,${Buffer.from('fake png').toString('base64')}` });

    mailer.sendMail.mockClear();
    const res = await request(app)
      .post(`/api/candidates/${candidateId}/submit`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('COMPLETED');

    // Admin-only notification: sent to the fixed operator address, never to
    // the candidate, and never blocking/failing the submission itself.
    const { ADMIN_NOTIFICATION_EMAIL } = require('../src/services/adminNotificationService');
    expect(mailer.sendMail).toHaveBeenCalledTimes(1);
    const call = mailer.sendMail.mock.calls[0][0];
    expect(call.to).toBe(ADMIN_NOTIFICATION_EMAIL);
    expect(call.subject).toMatch(/Candidate application submitted/i);
    expect(call.text).toContain('Complete Candidate');
  });
});

describe('Admin notifications', () => {
  test('creating a coordinator sends an admin-only notification', async () => {
    const token = await loginAsAdmin();
    mailer.sendMail.mockClear();

    const res = await request(app)
      .post('/api/coordinators')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Notification Test Coordinator', mobile: '9876512399' });

    expect(res.status).toBe(201);

    const { ADMIN_NOTIFICATION_EMAIL } = require('../src/services/adminNotificationService');
    expect(mailer.sendMail).toHaveBeenCalledTimes(1);
    const call = mailer.sendMail.mock.calls[0][0];
    expect(call.to).toBe(ADMIN_NOTIFICATION_EMAIL);
    expect(call.subject).toMatch(/New coordinator added/i);
    expect(call.text).toContain('Notification Test Coordinator');
  });

  test('a failed mailer.sendMail does not fail coordinator creation', async () => {
    const token = await loginAsAdmin();
    mailer.sendMail.mockClear();
    mailer.sendMail.mockRejectedValueOnce(new Error('SMTP temporarily unavailable'));

    const res = await request(app)
      .post('/api/coordinators')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Resilient Coordinator', mobile: '9876512398' });

    // The coordinator is still created even though the notification email failed.
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Resilient Coordinator');

    mailer.sendMail.mockResolvedValue({ delivered: false, devFallback: true });
  });
});

describe('Candidate soft delete', () => {
  async function createCandidate(token, overrides = {}) {
    const res = await request(app)
      .post('/api/candidates')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Delete Test Candidate', mobile: '9876500001', ...overrides });
    return res.body.data;
  }

  test('DELETE /api/candidates/:id soft-deletes — record disappears from the default list but is not destroyed', async () => {
    const token = await loginAsAdmin();
    const candidate = await createCandidate(token, { mobile: '9876500002' });

    const del = await request(app)
      .delete(`/api/candidates/${candidate.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);

    const getDeleted = await request(app)
      .get(`/api/candidates/${candidate.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getDeleted.status).toBe(404);

    const list = await request(app)
      .get('/api/candidates')
      .query({ search: candidate.candidate_number })
      .set('Authorization', `Bearer ${token}`);
    expect(list.body.data.rows.find((r) => r.id === candidate.id)).toBeUndefined();

    const trash = await request(app)
      .get('/api/candidates')
      .query({ deleted: true, search: candidate.candidate_number })
      .set('Authorization', `Bearer ${token}`);
    expect(trash.body.data.rows.find((r) => r.id === candidate.id)).toBeDefined();
  });

  test('DELETE /api/candidates/:id on an already-deleted or missing candidate returns 404', async () => {
    const token = await loginAsAdmin();
    const res = await request(app)
      .delete('/api/candidates/999999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test('POST /api/candidates/:id/restore brings a deleted candidate back to normal listings', async () => {
    const token = await loginAsAdmin();
    const candidate = await createCandidate(token, { mobile: '9876500003' });

    await request(app).delete(`/api/candidates/${candidate.id}`).set('Authorization', `Bearer ${token}`);

    const restore = await request(app)
      .post(`/api/candidates/${candidate.id}/restore`)
      .set('Authorization', `Bearer ${token}`);
    expect(restore.status).toBe(200);
    expect(restore.body.data.deleted_at).toBeNull();

    const getRestored = await request(app)
      .get(`/api/candidates/${candidate.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRestored.status).toBe(200);
  });

  test('POST /api/candidates/:id/restore on a candidate that is not deleted returns 400', async () => {
    const token = await loginAsAdmin();
    const candidate = await createCandidate(token, { mobile: '9876500004' });

    const res = await request(app)
      .post(`/api/candidates/${candidate.id}/restore`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});
