// backend/src/routes/coins.js
const express = require('express');
const { requireAuth }  = require('../middleware/auth');
const { claimDailyLogin, claimAdReward, getCoinHistory } = require('../controllers/coinsController');

const router = express.Router();

router.post('/daily-login', requireAuth, claimDailyLogin);
router.post('/ad-reward',   requireAuth, claimAdReward);
router.get('/history',      requireAuth, getCoinHistory);

module.exports = router;
