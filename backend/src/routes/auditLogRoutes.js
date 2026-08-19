const express = require('express');
const controller = require('../controllers/auditLogController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, requireRole('SUPER_ADMIN'), controller.list);

module.exports = router;
