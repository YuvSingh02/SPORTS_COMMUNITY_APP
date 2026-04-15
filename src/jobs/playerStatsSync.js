/**
 * playerStatsSync.js
 * Cron job — runs ESPN scraper every day at midnight.
 */

const cron = require('node-cron');
const { scrapeAllTeams } = require('../services/espnScraperService');

function startPlayerStatsSync() {
    // Runs every day at midnight
    cron.schedule('0 0 * * *', async () => {
        console.log('[CRON] Starting daily player stats sync...');
        try {
            await scrapeAllTeams();
        } catch (err) {
            console.error('[CRON] Sync failed:', err.message);
        }
    });

    console.log('[CRON] Player stats sync scheduled — runs daily at midnight');
}

// Allow manual trigger via: node -e "require('./src/jobs/playerStatsSync').runNow()"
async function runNow() {
    console.log('[CRON] Manual sync triggered');
    await scrapeAllTeams();
}

module.exports = { startPlayerStatsSync, runNow };