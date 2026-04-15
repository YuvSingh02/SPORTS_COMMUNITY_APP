// backend/src/jobs/matchPoller.js
//
// Cron schedule:
//   Every 5 min  → poll live match status
//   Every 30 min → poll for newly completed matches + trigger price update
//   Every day 00:00 → daily login reset / season health check

const cron     = require('node-cron');
const { getSupabaseClient } = require('../config/supabase');
const { fetchRecentMatches: fetchCricketMatches, fetchMatchPlayerStats } = require('../services/cricketApiService');
const { fetchRecentMatches: fetchFootballMatches }                        = require('../services/footballApiService');
const { updatePricesAfterMatch }  = require('../services/stockPriceEngine');
const { checkAndEndSeasons }      = require('../services/seasonService');
const logger = require('../utils/logger');

// ── Helpers ────────────────────────────────────────────────────────────────
const upsertMatches = async (matches) => {
  if (!matches.length) return [];
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('matches')
    .upsert(matches, { onConflict: 'external_id', ignoreDuplicates: false })
    .select('id, external_id, status');

  if (error) throw error;
  return data;
};

const findJustCompletedMatches = async () => {
  const supabase = getSupabaseClient();

  // Matches that were 'live' last poll and now show 'completed' in the API
  const { data, error } = await supabase
    .from('matches')
    .select('id, external_id, sport, status')
    .eq('status', 'completed')
    .is('updated_at', null);   // hasn't been price-processed yet (crude flag)

  if (error) throw error;
  return data ?? [];
};

// ── Jobs ──────────────────────────────────────────────────────────────────

/**
 * Poll APIs for match updates and upsert into DB.
 * Runs every 5 minutes.
 */
const pollMatchStatuses = async () => {
  logger.info('[Poller] Polling match statuses...');
  try {
    const [cricketMatches, footballMatches] = await Promise.allSettled([
      fetchCricketMatches({ limit: 20 }),
      fetchFootballMatches({ limit: 20 }),
    ]);

    const allMatches = [
      ...(cricketMatches.status  === 'fulfilled' ? cricketMatches.value  : []),
      ...(footballMatches.status === 'fulfilled' ? footballMatches.value : []),
    ];

    await upsertMatches(allMatches);
    logger.info(`[Poller] Upserted ${allMatches.length} matches`);
  } catch (err) {
    logger.error('[Poller] pollMatchStatuses failed:', err.message);
  }
};

/**
 * Find completed matches, fetch player stats, trigger price update.
 * Runs every 30 minutes.
 */
const processCompletedMatches = async () => {
  logger.info('[Poller] Processing completed matches...');
  try {
    const supabase = getSupabaseClient();

    // Find matches completed but not yet processed (no price_history entry)
    const { data: unprocessed } = await supabase
      .from('matches')
      .select('id, external_id, sport')
      .eq('status', 'completed')
      .not('id', 'in', supabase.from('price_history').select('match_id'));

    if (!unprocessed?.length) {
      logger.info('[Poller] No unprocessed completed matches');
      return;
    }

    for (const match of unprocessed) {
      try {
        // Fetch and upsert player stats from the API
        if (match.sport === 'cricket') {
          const statsRows = await fetchMatchPlayerStats(match.external_id);
          await upsertPlayerStats(statsRows, match.id);
        }
        // Football stats fetch can be added similarly

        // Trigger price recalculation
        await updatePricesAfterMatch(match.id);

        logger.info(`[Poller] Processed match ${match.id}`);
      } catch (err) {
        logger.error(`[Poller] Failed to process match ${match.id}:`, err.message);
        // Continue to next match — don't let one failure block others
      }
    }
  } catch (err) {
    logger.error('[Poller] processCompletedMatches failed:', err.message);
  }
};

const upsertPlayerStats = async (statsRows, matchId) => {
  const supabase = getSupabaseClient();

  for (const row of statsRows) {
    // Look up internal player id by external_id
    const { data: player } = await supabase
      .from('players')
      .select('id')
      .eq('external_id', row.external_player_id)
      .single();

    if (!player) continue;

    await supabase
      .from('player_stats')
      .upsert(
        { player_id: player.id, match_id: matchId, raw_stats: row.raw_stats },
        { onConflict: 'player_id,match_id' }
      );
  }
};

/**
 * Daily tasks: season health, streak resets etc.
 * Runs at midnight IST (18:30 UTC).
 */
const runDailyTasks = async () => {
  logger.info('[Scheduler] Running daily tasks...');
  try {
    await checkAndEndSeasons();
    logger.info('[Scheduler] Daily tasks complete');
  } catch (err) {
    logger.error('[Scheduler] Daily tasks failed:', err.message);
  }
};

// ── Register cron jobs ────────────────────────────────────────────────────
const startScheduler = () => {
  // Every 5 minutes — poll match statuses
  cron.schedule('*/5 * * * *', pollMatchStatuses, { timezone: 'Asia/Kolkata' });

  // Every 30 minutes — process completed matches + price updates
  cron.schedule('*/30 * * * *', processCompletedMatches, { timezone: 'Asia/Kolkata' });

  // Daily at midnight IST
  cron.schedule('0 18 * * *', runDailyTasks, { timezone: 'UTC' });

  logger.info('[Scheduler] All cron jobs registered');
};

module.exports = { startScheduler };
