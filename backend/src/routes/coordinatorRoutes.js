const express = require('express');
const controller = require('../controllers/coordinatorController');
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createValidator,
  updateValidator,
  statusValidator,
  idParamValidator,
  listValidator,
} = require('../validators/coordinatorValidators');

const router = express.Router();

router.use(authenticate, requireRole('SUPER_ADMIN'));

router.post('/', createValidator, validate, controller.create);
router.get('/', listValidator, validate, controller.list);
router.get('/:id', idParamValidator, validate, controller.getOne);
router.patch('/:id', updateValidator, validate, controller.update);
router.patch('/:id/status', statusValidator, validate, controller.updateStatus);

module.exports = router;
