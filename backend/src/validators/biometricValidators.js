const { body, param } = require('express-validator');

const captureValidator = [
  param('id').isInt().toInt(),
  body('hand').isIn(['LEFT_HAND', 'RIGHT_HAND']).withMessage('hand must be LEFT_HAND or RIGHT_HAND'),
  // Present only when the client used an RD Service device (Mantra MFS110 etc).
  // The PID block is hashed server-side and never persisted — see
  // biometric/providers/rdServiceProvider.js.
  body('clientCapture').optional().isObject().withMessage('clientCapture must be an object'),
  body('clientCapture.pidBlock').optional().isString().withMessage('pidBlock must be a string'),
  body('clientCapture.qualityScore')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('qualityScore must be between 0 and 100'),
  body('clientCapture.deviceSerial').optional({ nullable: true }).isString().trim().isLength({ max: 100 }),
  body('clientCapture.deviceModel').optional({ nullable: true }).isString().trim().isLength({ max: 100 }),
  body('clientCapture.rdsVersion').optional({ nullable: true }).isString().trim().isLength({ max: 50 }),
  body('clientCapture.errorCode').optional({ nullable: true }).isInt().toInt(),
  body('clientCapture.errorInfo').optional({ nullable: true }).isString().trim().isLength({ max: 500 }),
];

const verifyValidator = [
  param('id').isInt().toInt(),
  body('hand').isIn(['LEFT_HAND', 'RIGHT_HAND']).withMessage('hand must be LEFT_HAND or RIGHT_HAND'),
];

module.exports = { captureValidator, verifyValidator };
