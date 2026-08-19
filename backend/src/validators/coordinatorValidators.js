const { body, param, query } = require('express-validator');

const createValidator = [
  body('name').isString().trim().isLength({ min: 2, max: 150 }).withMessage('Name is required'),
  body('mobile').isString().trim().matches(/^[6-9]\d{9}$/).withMessage('Mobile number must be exactly 10 digits'),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Invalid email'),
  body('employeeCode').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 50 }),
  body('location').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 150 }),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE']),
];

const updateValidator = [
  param('id').isInt().toInt(),
  body('name').optional().isString().trim().isLength({ min: 2, max: 150 }),
  body('mobile').optional().isString().trim().matches(/^[6-9]\d{9}$/).withMessage('Mobile number must be exactly 10 digits'),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Invalid email'),
  body('employeeCode').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 50 }),
  body('location').optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max: 150 }),
];

const statusValidator = [
  param('id').isInt().toInt(),
  body('status').isIn(['ACTIVE', 'INACTIVE']).withMessage('Status must be ACTIVE or INACTIVE'),
];

const idParamValidator = [param('id').isInt().toInt()];

const listValidator = [
  query('status').optional().isIn(['ACTIVE', 'INACTIVE']),
  query('search').optional().isString().trim(),
];

module.exports = { createValidator, updateValidator, statusValidator, idParamValidator, listValidator };
