require('dotenv').config();

const required = (key) => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env variable: ${key}`);
  return value;
};

const optional = (key, fallback) => process.env[key] ?? fallback;

const config = {
  app: {
    port: parseInt(optional('PORT', '3000'), 10),
    nodeEnv: optional('NODE_ENV', 'development'),
    isDev: optional('NODE_ENV', 'development') === 'development',
    jwtSecret: required('JWT_SECRET'),
  },

  supabase: {
    url: required('SUPABASE_URL'),
    serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
    anonKey: required('SUPABASE_ANON_KEY'),
  },

  cricketApi: {
    key: required('CRICKET_API_KEY'),
    baseUrl: optional('CRICKET_API_BASE_URL', 'https://api.cricketdata.org/v1'),
  },

  footballApi: {
    key: optional('FOOTBALL_API_KEY', ''),
    baseUrl: optional('FOOTBALL_API_BASE_URL', 'https://api.football-data.org/v4'),
  },

  firebase: {
    projectId: optional('FIREBASE_PROJECT_ID', ''),
    privateKey: optional('FIREBASE_PRIVATE_KEY', '').replace(/\\n/g, '\n'),
    clientEmail: optional('FIREBASE_CLIENT_EMAIL', ''),
  },

  r2: {
    accountId: optional('R2_ACCOUNT_ID', ''),
    accessKeyId: optional('R2_ACCESS_KEY_ID', ''),
    secretAccessKey: optional('R2_SECRET_ACCESS_KEY', ''),
    bucketName: optional('R2_BUCKET_NAME', 'pitchstock-assets'),
    publicUrl: optional('R2_PUBLIC_URL', ''),
  },

  rateLimit: {
    windowMs: parseInt(optional('RATE_LIMIT_WINDOW_MS', '900000'), 10),
    maxRequests: parseInt(optional('RATE_LIMIT_MAX_REQUESTS', '100'), 10),
  },

  coins: {
    signupBonus: 1000,
    dailyLogin: 75,
    watchAd: 50,
    referrerBonus: 500,
    referredBonus: 250,
    referredAdsRequired: 5,
    seasonStartCoins: 1000,
  },

  trophyCoins: {
    firstPlace: 30000,
    secondPlace: 15000,
    thirdPlace: 5000,
  },
};

module.exports = config;