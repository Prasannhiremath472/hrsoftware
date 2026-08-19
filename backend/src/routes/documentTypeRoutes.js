const express = require('express');
const controller = require('../controllers/documentTypeController');
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { documentTypeCreateValidator, documentTypeUpdateValidator } = require('../validators/documentValidators');

const router = express.Router();

router.get('/', authenticate, controller.list);
router.post('/', authenticate, requireRole('SUPER_ADMIN'), documentTypeCreateValidator, validate, controller.create);
router.patch('/:id', authenticate, requireRole('SUPER_ADMIN'), documentTypeUpdateValidator, validate, controller.update);

module.exports = router;
