const { body } = require('express-validator');

const loginValidator = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isString().isLength({ min: 1 }).withMessage('Password is required'),
];

const verifyOtpValidator = [
  body('preAuthToken').isString().isLength({ min: 10 }).withMessage('Login session is invalid'),
  body('otp').isString().matches(/^\d{6}$/).withMessage('Enter the 6-digit code sent to your email'),
];

const resendOtpValidator = [
  body('preAuthToken').isString().isLength({ min: 10 }).withMessage('Login session is invalid'),
];

module.exports = { loginValidator, verifyOtpValidator, resendOtpValidator };
