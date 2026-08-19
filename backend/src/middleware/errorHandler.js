const logger = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const isProd = process.env.NODE_ENV === 'production';

  logger.error(err.message || 'Unhandled error', {
    statusCode,
    path: req.originalUrl,
    method: req.method,
  });

  const body = {
    success: false,
    message: statusCode === 500 && isProd ? 'Internal server error' : err.message || 'Internal server error',
  };

  if (err.errors) body.errors = err.errors;
  if (!isProd && statusCode === 500) body.stack = err.stack;

  res.status(statusCode).json(body);
}

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFoundHandler };
