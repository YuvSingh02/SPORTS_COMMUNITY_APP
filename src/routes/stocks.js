// backend/src/routes/stocks.js
const express = require('express');
const Joi     = require('joi');
const { requireAuth }               = require('../middleware/auth');
const { validate }                  = require('../middleware/validate');
const { buyStock, sellStock }       = require('../controllers/stocksController');

const router = express.Router();

const tradeSchema = Joi.object({
  player_id: Joi.string().uuid().required(),
  shares:    Joi.number().integer().min(1).max(1000).required(),
});

router.post('/buy',  requireAuth, validate(tradeSchema), buyStock);
router.post('/sell', requireAuth, validate(tradeSchema), sellStock);

module.exports = router;
