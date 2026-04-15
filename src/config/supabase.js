const { createClient } = require('@supabase/supabase-js');
const config = require('./env');
const logger = require('../utils/logger');

let client = null;

const getSupabaseClient = () => {
  if (client) return client;

  client = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
  });

  logger.info('Supabase client initialized');
  return client;
};

module.exports = { getSupabaseClient };
