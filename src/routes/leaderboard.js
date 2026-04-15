// backend/src/routes/leaderboard.js

const express = require('express');
const { getLeaderboard } = require('../controllers/leaderboardController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, getLeaderboard);

module.exports = router;