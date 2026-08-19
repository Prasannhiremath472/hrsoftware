const { body, param } = require('express-validator');

const FINGERS = [
  'LEFT_THUMB', 'LEFT_INDEX', 'LEFT_MIDDLE', 'LEFT_RING', 'LEFT_LITTLE',
  'RIGHT_THUMB', 'RIGHT_INDEX', 'RIGHT_MIDDLE', 'RIGHT_RING', 'RIGHT_LITTLE',
];

// Templates are base64. Bounded to catch malformed/oversized payloads early —
// an ISO 19794-2 template is typically well under 2KB, so base64 stays small.
const templateRule = (field) =>
  body(field)
    .isString()
    .withMessage('template must be a base64 string')
    .isLength({ min: 32, max: 65536 })
    .withMessage('template is missing or an implausible size')
    .matches(/^[A-Za-z0-9+/]+={0,2}$/)
    .withMessage('template must be valid base64');

const enrollValidator = [
  param('id').isInt().toInt(),
  body('finger').isIn(FINGERS).withMessage(`finger must be one of: ${FINGERS.join(', ')}`),
  templateRule('template'),
  body('templateFormat').optional().isIn(['ISO_19794_2', 'ANSI_378', 'PROPRIETARY']),
  body('qualityScore').isFloat({ min: 0, max: 100 }).withMessage('qualityScore must be between 0 and 100'),
  body('deviceSerial').optional({ nullable: true }).isString().trim().isLength({ max: 100 }),
  body('deviceModel').optional({ nullable: true }).isString().trim().isLength({ max: 100 }),
  body('sdkVersion').optional({ nullable: true }).isString().trim().isLength({ max: 50 }),
];

const verifyValidator = [
  param('id').isInt().toInt(),
  body('finger').isIn(FINGERS).withMessage(`finger must be one of: ${FINGERS.join(', ')}`),
  templateRule('template'),
];

const searchValidator = [
  templateRule('template'),
  body('excludeCandidateId').optional({ nullable: true }).isInt().toInt(),
];

module.exports = { enrollValidator, verifyValidator, searchValidator, FINGERS };
