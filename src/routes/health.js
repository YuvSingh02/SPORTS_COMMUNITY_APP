const express = require('express');
const { getSupabaseClient } = require('../config/supabase');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    // Ping Supabase to verify DB connectivity
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('users').select('id').limit(1);

    if (error) throw new Error(`Supabase ping failed: ${error.message}`);

    return sendSuccess(res, {
      status: 'healthy',
      db: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return sendError(res, `Health check failed: ${err.message}`, 503);
  }
});

module.exports = router;
