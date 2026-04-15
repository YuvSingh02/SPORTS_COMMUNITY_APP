/**
 * Standard shape for every API response.
 * { success, data, message, meta }
 */

const sendSuccess = (res, data = null, message = 'OK', statusCode = 200, meta = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta,
  });
};

const sendCreated = (res, data = null, message = 'Created') => {
  return sendSuccess(res, data, message, 201);
};

const sendError = (res, message = 'An error occurred', statusCode = 500, details = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    details,
  });
};

const sendNotFound = (res, message = 'Resource not found') => {
  return sendError(res, message, 404);
};

const sendUnauthorized = (res, message = 'Unauthorized') => {
  return sendError(res, message, 401);
};

const sendForbidden = (res, message = 'Forbidden') => {
  return sendError(res, message, 403);
};

const sendValidationError = (res, details) => {
  return sendError(res, 'Validation failed', 422, details);
};

const sendPaginated = (res, data, total, page, limit) => {
  return sendSuccess(res, data, 'OK', 200, {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
};

module.exports = {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendValidationError,
  sendPaginated,
};
