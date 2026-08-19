const { body, param } = require('express-validator');

const putSelectionValidator = [
  param('id').isInt().toInt(),
  body('documentTypeIds').isArray().withMessage('documentTypeIds must be an array'),
  body('documentTypeIds.*').isInt().toInt().withMessage('Each document type id must be an integer'),
];

module.exports = { putSelectionValidator };
