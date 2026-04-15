const logger = require('../utils/logger');
const { sendError } = require('../utils/apiResponse');

const globalErrorHandler = (err, req, res, next) => {
  logger.error(`${req.method} ${req.path} — ${err.message}`, err);

  // Supabase / Postgres errors
  if (err.code === '23505') {
    return sendError(res, 'A record with this value already exists', 409);
  }

  if (err.code === '23503') {
    return sendError(res, 'Referenced record does not exist', 400);
  }

  // Joi validation errors (passed manually)
  if (err.isJoi) {
    return sendError(res, err.message, 422, err.details);
  }

  // Default
  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error'
      : err.message;

  return sendError(res, message, statusCode);
};

const notFoundHandler = (req, res) => {
  return sendError(res, `Route ${req.method} ${req.path} not found`, 404);
};

module.exports = { globalErrorHandler, notFoundHandler };
