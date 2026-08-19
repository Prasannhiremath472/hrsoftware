const express = require('express');
const controller = require('../controllers/biometricController');
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(authenticate, requireRole('SUPER_ADMIN'));

router.get('/device-status', controller.deviceStatus);

module.exports = router;
