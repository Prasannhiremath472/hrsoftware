const express = require('express');
const authController = require('../controllers/authController');
const { loginValidator, verifyOtpValidator, resendOtpValidator } = require('../validators/authValidators');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/login', loginValidator, validate, authController.login);
router.post('/verify-otp', verifyOtpValidator, validate, authController.verifyOtp);
router.post('/resend-otp', resendOtpValidator, validate, authController.resendOtp);
router.get('/me', authenticate, authController.me);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
