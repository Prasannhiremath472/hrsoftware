const { body, param, query } = require('express-validator');

const createCandidateValidator = [
  body('fullName').isString().trim().isLength({ min: 2, max: 150 }).withMessage('Full name is required'),
  body('mobile').isString().trim().matches(/^[6-9]\d{9}$/).withMessage('Mobile number must be exactly 10 digits'),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Invalid email'),
  body('dob').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Invalid date of birth'),
  body('gender').optional({ nullable: true, checkFalsy: true }).isIn(['MALE', 'FEMALE', 'OTHER']),
  body('coordinatorId').optional({ nullable: true, checkFalsy: true }).isInt().toInt(),
];

const updateCandidateValidator = [
  param('id').isInt().toInt(),
  body('fullName').optional().isString().trim().isLength({ min: 2, max: 150 }),
  body('mobile').optional().isString().trim().matches(/^[6-9]\d{9}$/).withMessage('Mobile number must be exactly 10 digits'),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail(),
  body('dob').optional({ nullable: true, checkFalsy: true }).isISO8601(),
  body('gender').optional({ nullable: true, checkFalsy: true }).isIn(['MALE', 'FEMALE', 'OTHER']),
];

const idParamValidator = [param('id').isInt().toInt()];

const listValidator = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  query('coordinatorId').optional().isInt().toInt(),
  query('status').optional().isString(),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
  query('deleted').optional().isBoolean().toBoolean(),
];

const coordinatorAssignValidator = [
  param('id').isInt().toInt(),
  body('coordinatorId').isInt().toInt().withMessage('coordinatorId is required'),
];

const kycValidator = [
  param('id').isInt().toInt(),
  body('applicantName').optional().isString().trim().isLength({ min: 2, max: 150 }).withMessage('Applicant name must be 2-150 characters'),
  body('fatherSpouseName').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 150 }),
  body('gender').optional().isIn(['MALE', 'FEMALE']),
  body('maritalStatus').optional().isIn(['SINGLE', 'MARRIED']),
  body('dob').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Invalid date of birth'),
  body('nationality').optional().isString().trim().isLength({ max: 80 }),
  body('residencyStatus').optional().isIn(['RESIDENT_INDIVIDUAL', 'NON_RESIDENT', 'FOREIGN_NATIONAL']),
  body('panNumber').optional({ nullable: true, checkFalsy: true }).matches(/^[A-Z]{5}[0-9]{4}[A-Z]$/).withMessage('Invalid PAN format'),
  body('aadhaarNumber').optional({ nullable: true, checkFalsy: true }).matches(/^\d{12}$/).withMessage('Aadhaar must be 12 digits'),
  body('proofOfIdentity').optional().isIn(['AADHAAR', 'PAN', 'PASSPORT', 'DL', 'VOTER_ID', 'OTHER']),
];

const addressValidator = [
  param('id').isInt().toInt(),
  body('residenceAddress').optional().isString().trim().isLength({ max: 500 }),
  body('residencePinCode').optional({ nullable: true, checkFalsy: true }).matches(/^\d{6}$/).withMessage('PIN code must be exactly 6 digits'),
  body('contactEmail').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Invalid email'),
  body('contactMobile').optional({ nullable: true, checkFalsy: true }).matches(/^[6-9]\d{9}$/).withMessage('Mobile number must be exactly 10 digits'),
  body('proofOfAddress').optional().isIn(['AADHAAR', 'PASSPORT', 'UTILITY_BILL', 'BANK_STATEMENT', 'RENT_AGREEMENT', 'OTHER']),
  body('sameAsResidence').optional().isBoolean().toBoolean(),
  body('permanentAddress').optional().isString().trim().isLength({ max: 500 }),
  body('permanentPinCode').optional({ nullable: true, checkFalsy: true }).matches(/^\d{6}$/).withMessage('PIN code must be exactly 6 digits'),
];

const originalVerificationValidator = [
  param('id').isInt().toInt(),
  body('originalsVerified').isBoolean().toBoolean(),
  body('selfAttestedReceived').isBoolean().toBoolean(),
];

const declarationValidator = [
  param('id').isInt().toInt(),
  body('accepted').isBoolean().toBoolean(),
];

module.exports = {
  createCandidateValidator,
  updateCandidateValidator,
  idParamValidator,
  listValidator,
  coordinatorAssignValidator,
  kycValidator,
  addressValidator,
  originalVerificationValidator,
  declarationValidator,
};
