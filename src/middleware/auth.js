const { getSupabaseClient } = require('../config/supabase');
const { sendUnauthorized } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Verifies the Bearer token issued by Supabase Auth.
 * Attaches req.user = { id, email, ...claims } on success.
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendUnauthorized(res, 'Missing or malformed Authorization header');
    }

    const token = authHeader.split(' ')[1];
    const supabase = getSupabaseClient();

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return sendUnauthorized(res, 'Invalid or expired token');
    }

    req.user = user;
    next();
  } catch (err) {
    logger.error('Auth middleware error', err);
    return sendUnauthorized(res, 'Authentication failed');
  }
};

/**
 * Soft auth — attaches req.user if token present, but does not block.
 * Useful for routes that show extra data when logged in.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

    const token = authHeader.split(' ')[1];
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser(token);

    if (user) req.user = user;
    next();
  } catch {
    next();
  }
};

module.exports = { requireAuth, optionalAuth };
