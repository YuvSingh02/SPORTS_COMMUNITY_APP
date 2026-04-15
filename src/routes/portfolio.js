// backend/src/routes/portfolio.js

const express = require('express');
const { getHolding, getPortfolio } = require('../controllers/portfolioController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, getPortfolio);
router.get('/holding/:playerId', requireAuth, getHolding);

module.exports = router;