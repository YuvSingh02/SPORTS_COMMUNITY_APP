// backend/src/routes/players.js

const express = require('express');
const router = express.Router();
const playersController = require('../controllers/playersController');

router.get('/', playersController.getAllPlayers);
router.get('/team/:team', playersController.getPlayersByTeam);
router.get('/:id', playersController.getPlayerById);

module.exports = router;