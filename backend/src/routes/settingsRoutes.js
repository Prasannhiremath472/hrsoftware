const express = require('express');
const controller = require('../controllers/settingsController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, requireRole('SUPER_ADMIN'));

router.get('/', controller.getSettings);
router.put('/', controller.putSettings);

module.exports = router;
