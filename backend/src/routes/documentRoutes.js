const express = require('express');
const controller = require('../controllers/documentController');
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { docIdParamValidator, rejectValidator } = require('../validators/documentValidators');

const router = express.Router();

router.use(authenticate, requireRole('SUPER_ADMIN'));

router.get('/:id/view', docIdParamValidator, validate, controller.view);
router.get('/:id/download', docIdParamValidator, validate, controller.download);
router.patch('/:id/verify', docIdParamValidator, validate, controller.verify);
router.patch('/:id/reject', rejectValidator, validate, controller.reject);

module.exports = router;
