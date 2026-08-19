const express = require('express');

const router = express.Router();

router.use('/auth', require('./authRoutes'));
router.use('/coordinators', require('./coordinatorRoutes'));
router.use('/candidates', require('./candidateRoutes'));
router.use('/document-types', require('./documentTypeRoutes'));
router.use('/documents', require('./documentRoutes'));
router.use('/biometric', require('./biometricRoutes'));
router.use('/fingerprints', require('./fingerprintRoutes'));
router.use('/reports', require('./reportRoutes'));
router.use('/audit-logs', require('./auditLogRoutes'));
router.use('/settings', require('./settingsRoutes'));

module.exports = router;
