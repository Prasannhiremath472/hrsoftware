const { body, param } = require('express-validator');

const documentTypeCreateValidator = [
  body('name').isString().trim().isLength({ min: 2, max: 150 }),
  body('code').isString().trim().isLength({ min: 2, max: 80 }),
  body('isMandatory').optional().isBoolean().toBoolean(),
  body('displayOrder').optional().isInt().toInt(),
];

const documentTypeUpdateValidator = [
  param('id').isInt().toInt(),
  body('name').optional().isString().trim().isLength({ min: 2, max: 150 }),
  body('isMandatory').optional().isBoolean().toBoolean(),
  body('isActive').optional().isBoolean().toBoolean(),
  body('displayOrder').optional().isInt().toInt(),
];

const uploadValidator = [
  param('id').isInt().toInt(),
  body('documentTypeId').isInt().withMessage('documentTypeId is required').toInt(),
];

const docIdParamValidator = [param('id').isInt().toInt()];

const rejectValidator = [
  param('id').isInt().toInt(),
  body('reason').isString().trim().isLength({ min: 2, max: 255 }).withMessage('Rejection reason is required'),
  body('comment').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 500 }),
];

module.exports = {
  documentTypeCreateValidator,
  documentTypeUpdateValidator,
  uploadValidator,
  docIdParamValidator,
  rejectValidator,
};
