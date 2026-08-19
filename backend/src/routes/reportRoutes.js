const express = require('express');
const controller = require('../controllers/reportController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, requireRole('SUPER_ADMIN'));

router.get('/candidates', controller.candidates);
router.get('/coordinators', controller.coordinators);
router.get('/status', controller.status);
router.get('/biometric', controller.biometric);
router.get('/documents', controller.documents);
router.get('/monthly-registrations', controller.monthlyRegistrations);

module.exports = router;
