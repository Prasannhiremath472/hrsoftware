const express = require('express');
const controller = require('../controllers/fingerprintController');
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { searchValidator } = require('../validators/fingerprintValidators');

const router = express.Router();

router.use(authenticate, requireRole('SUPER_ADMIN'));

// 1:N duplicate search across all enrolled candidates. Not candidate-scoped,
// so it lives here rather than under /candidates/:id.
router.post('/search', searchValidator, validate, controller.search);

module.exports = router;
