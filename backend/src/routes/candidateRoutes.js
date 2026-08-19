const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { upload } = require('../middleware/upload');

const candidateController = require('../controllers/candidateController');
const kycController = require('../controllers/kycController');
const addressController = require('../controllers/addressController');
const documentController = require('../controllers/documentController');
const originalVerificationController = require('../controllers/originalVerificationController');
const photoController = require('../controllers/photoController');
const biometricController = require('../controllers/biometricController');
const declarationController = require('../controllers/declarationController');
const signatureController = require('../controllers/signatureController');

const {
  createCandidateValidator,
  updateCandidateValidator,
  idParamValidator,
  listValidator,
  coordinatorAssignValidator,
  kycValidator,
  addressValidator,
  originalVerificationValidator,
  declarationValidator,
} = require('../validators/candidateValidators');
const { uploadValidator, docIdParamValidator: candidateIdValidator } = require('../validators/documentValidators');
const { captureValidator, verifyValidator } = require('../validators/biometricValidators');
const fingerprintController = require('../controllers/fingerprintController');
const {
  enrollValidator: fingerprintEnrollValidator,
  verifyValidator: fingerprintVerifyValidator,
} = require('../validators/fingerprintValidators');
const documentSelectionController = require('../controllers/documentSelectionController');
const { putSelectionValidator } = require('../validators/documentSelectionValidators');

const router = express.Router();

router.use(authenticate, requireRole('SUPER_ADMIN'));

// Candidates core
router.post('/', createCandidateValidator, validate, candidateController.create);
router.get('/', listValidator, validate, candidateController.list);
router.get('/:id', idParamValidator, validate, candidateController.getOne);
router.patch('/:id', updateCandidateValidator, validate, candidateController.update);
router.patch('/:id/coordinator', coordinatorAssignValidator, validate, candidateController.assignCoordinator);
router.post('/:id/submit', idParamValidator, validate, candidateController.submit);
router.get('/:id/status-history', idParamValidator, validate, candidateController.statusHistory);

// KYC
router.get('/:id/kyc', idParamValidator, validate, kycController.getKyc);
router.put('/:id/kyc', kycValidator, validate, kycController.putKyc);

// Address
router.get('/:id/address', idParamValidator, validate, addressController.getAddress);
router.put('/:id/address', addressValidator, validate, addressController.putAddress);

// Document checklist selection — which document types apply to this candidate
router.get('/:id/document-selection', idParamValidator, validate, documentSelectionController.getSelection);
router.put('/:id/document-selection', putSelectionValidator, validate, documentSelectionController.putSelection);

// Documents (nested under candidate for upload/list)
router.post('/:id/documents', upload.single('file'), uploadValidator, validate, documentController.upload);
router.get('/:id/documents', idParamValidator, validate, documentController.listForCandidate);

// Original verification
router.get('/:id/original-verification', idParamValidator, validate, originalVerificationController.getOriginalVerification);
router.put('/:id/original-verification', originalVerificationValidator, validate, originalVerificationController.putOriginalVerification);

// Photo
router.post('/:id/photo', upload.single('file'), candidateIdValidator, validate, photoController.capturePhoto);
router.get('/:id/photo', candidateIdValidator, validate, photoController.streamPhoto);

// Biometric
router.post('/:id/biometric/capture', captureValidator, validate, biometricController.capture);
router.get('/:id/biometric', idParamValidator, validate, biometricController.listForCandidate);
router.post('/:id/biometric/verify', verifyValidator, validate, biometricController.verify);

// Declaration
router.get('/:id/declaration', idParamValidator, validate, declarationController.getDeclaration);
router.put('/:id/declaration', declarationValidator, validate, declarationController.putDeclaration);

// Signature
router.post('/:id/signature', idParamValidator, validate, signatureController.saveSignature);
router.get('/:id/signature', candidateIdValidator, validate, signatureController.streamSignature);

// Fingerprint templates (Mantra non-Aadhaar SDK path — stores real templates
// for 1:1 verification and 1:N duplicate detection, unlike the RD Service
// path which stores only a proof-of-capture hash).
router.post('/:id/fingerprints', fingerprintEnrollValidator, validate, fingerprintController.enroll);
router.get('/:id/fingerprints', idParamValidator, validate, fingerprintController.listForCandidate);
router.post('/:id/fingerprints/verify', fingerprintVerifyValidator, validate, fingerprintController.verify);

module.exports = router;
