// backend/src/routes/matches.js

const express = require('express');
const router = express.Router();
const { getCurrentMatches } = require('../services/cricketDataService');

router.get('/live', async (req, res) => {
    try {
        const matches = await getCurrentMatches();
        return res.json({ success: true, count: matches.length, matches });
    } catch (err) {
        console.error('[matches] Error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch matches' });
    }
});

module.exports = router;