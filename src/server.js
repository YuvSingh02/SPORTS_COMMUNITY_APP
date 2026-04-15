const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const config = require('./config/env');
const logger = require('./utils/logger');
const { globalErrorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { startPlayerStatsSync, runNow } = require('./jobs/playerStatsSync');

const healthRoutes = require('./routes/health');

const createServer = () => {
  const app = express();

  app.use(helmet());

  app.use(
    cors({
      origin: config.app.isDev ? '*' : ['https://pitchstock.app'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests — please slow down' },
  });
  app.use('/api/', limiter);

  if (config.app.isDev) {
    app.use((req, _res, next) => {
      logger.debug(`${req.method} ${req.path}`);
      next();
    });
  }

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/players', require('./routes/players'));
  app.use('/api/coins', require('./routes/coins'));
  app.use('/api/stocks', require('./routes/stocks'));
  app.use('/api/matches', require('./routes/matches'));
  app.use('/api/portfolio', require('./routes/portfolio')); // ← added
  app.use('/api/leaderboard', require('./routes/leaderboard'));
  app.use('/api/community', require('./routes/community'));
  

  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
};

const startServer = () => {
  const app = createServer();

  app.listen(config.app.port, () => {
    logger.info(`PitchStock backend running on port ${config.app.port} [${config.app.nodeEnv}]`);
  });

  // Start midnight cron
  startPlayerStatsSync();

  // Run once immediately on startup in dev
  if (config.app.isDev) {
    logger.info('[cron] Dev mode — running player stats sync now...');
    runNow();
  }
};

startServer();