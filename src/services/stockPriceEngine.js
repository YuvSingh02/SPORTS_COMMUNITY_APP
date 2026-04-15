// backend/src/services/stockPriceEngine.js
//
// Algorithm: player stock price updates after each completed match.
//
// Price formula:
//   new_price = old_price * (1 + delta)
//   delta     = clamp(performance_factor * volatility, -MAX_MOVE, +MAX_MOVE)
//
// Performance factor is sport-specific and normalized to [-1, +1].

const { getSupabaseClient } = require('../config/supabase');
const logger = require('../utils/logger');

// ── Constants ──────────────────────────────────────────────────────────────
const PRICE_FLOOR      = 10;     // coins — a player can never go below this
const PRICE_CEILING    = 50_000; // coins
const MAX_MOVE_PCT     = 0.25;   // ±25% max swing per match
const FORM_SMOOTHING   = 0.3;    // EMA alpha for rolling form score

// ── Cricket scoring weights ────────────────────────────────────────────────
// Each stat contributes a weighted delta; final sum is clamped to [-1, +1]
const cricketWeights = {
  runs:           { weight: 0.003,  max: 200 },   // 100 runs → +0.3
  wickets:        { weight: 0.12,   max: 10  },   // 3 wickets → +0.36
  fifties:        { weight: 0.15,   max: 3   },   // 1 fifty   → +0.15
  hundreds:       { weight: 0.35,   max: 2   },   // 1 hundred → +0.35
  catches:        { weight: 0.05,   max: 5   },   // 2 catches → +0.10
  economy_rate:   { weight: -0.04,  max: 12  },   // bad economy → negative
  strike_rate:    { weight: 0.001,  max: 200 },   // bonus for fast scoring
  duck:           { weight: -0.20,  max: 1   },   // duck → -0.20
  no_ball:        { weight: -0.03,  max: 5   },
  wide:           { weight: -0.02,  max: 10  },
};

// ── Football scoring weights ───────────────────────────────────────────────
const footballWeights = {
  goals:          { weight: 0.30,  max: 5  },   // 1 goal   → +0.30
  assists:        { weight: 0.18,  max: 5  },   // 1 assist → +0.18
  clean_sheet:    { weight: 0.20,  max: 1  },   // keeper/defender bonus
  saves:          { weight: 0.08,  max: 10 },
  tackles:        { weight: 0.03,  max: 15 },
  pass_accuracy:  { weight: 0.15,  max: 100 },  // 0–100 % → 0–0.15
  yellow_card:    { weight: -0.15, max: 1  },
  red_card:       { weight: -0.40, max: 1  },
  own_goal:       { weight: -0.35, max: 1  },
  minutes_played: { weight: 0.001, max: 90 },   // participation bonus
};

// ── Helpers ────────────────────────────────────────────────────────────────
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const computePerformanceFactor = (stats, weights) => {
  let factor = 0;

  for (const [key, { weight, max }] of Object.entries(weights)) {
    const rawValue = stats[key] ?? 0;
    const normalized = clamp(rawValue / max, -1, 1);
    factor += normalized * weight;
  }

  return clamp(factor, -1, 1);
};

/**
 * Compute normalised performance score (0–100) for leaderboard / UI display.
 */
const computePerformanceScore = (stats, sport) => {
  const weights = sport === 'cricket' ? cricketWeights : footballWeights;
  const factor  = computePerformanceFactor(stats, weights);
  // Map [-1, +1] → [0, 100]
  return Math.round((factor + 1) * 50);
};

/**
 * Compute the new price for a player after a match.
 *
 * @param {number} currentPrice
 * @param {Object} stats         — raw match stats
 * @param {string} sport         — 'cricket' | 'football'
 * @param {number} currentForm   — current EMA form score 0–100
 * @returns {{ newPrice, delta, performanceScore, newFormScore }}
 */
const computeNewPrice = (currentPrice, stats, sport, currentForm) => {
  const weights = sport === 'cricket' ? cricketWeights : footballWeights;

  const performanceFactor = computePerformanceFactor(stats, weights);
  const performanceScore  = computePerformanceScore(stats, sport);

  // Volatility: cheaper players move more (high volatility for < 500 coins)
  const volatility =
    currentPrice < 200   ? 1.4 :
    currentPrice < 500   ? 1.2 :
    currentPrice < 2000  ? 1.0 :
    currentPrice < 10000 ? 0.85 :
    0.65;

  const delta    = clamp(performanceFactor * volatility, -MAX_MOVE_PCT, MAX_MOVE_PCT);
  const rawPrice = Math.round(currentPrice * (1 + delta));
  const newPrice = clamp(rawPrice, PRICE_FLOOR, PRICE_CEILING);

  // Exponential moving average for form score
  const newFormScore = Math.round(
    FORM_SMOOTHING * performanceScore + (1 - FORM_SMOOTHING) * currentForm
  );

  return { newPrice, delta, performanceScore, newFormScore };
};

// ── Main update function ───────────────────────────────────────────────────
/**
 * Called by the scheduler after a match completes.
 * Fetches all player stats for that match, recalculates prices,
 * and writes updates to the DB atomically.
 *
 * @param {string} matchId
 */
const updatePricesAfterMatch = async (matchId) => {
  const supabase = getSupabaseClient();

  logger.info(`[PriceEngine] Processing match ${matchId}`);

  try {
    // 1. Fetch match + all player stats for it
    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .select('id, sport, status')
      .eq('id', matchId)
      .single();

    if (matchErr || !match) throw new Error(`Match ${matchId} not found`);
    if (match.status !== 'completed') {
      logger.info(`[PriceEngine] Match ${matchId} not completed — skipping`);
      return;
    }

    const { data: statsRows, error: statsErr } = await supabase
      .from('player_stats')
      .select(`
        id,
        player_id,
        raw_stats,
        players ( id, current_price, prev_price, form_score, sport )
      `)
      .eq('match_id', matchId);

    if (statsErr) throw statsErr;
    if (!statsRows?.length) {
      logger.warn(`[PriceEngine] No stats found for match ${matchId}`);
      return;
    }

    // 2. Compute new prices
    const priceUpdates    = [];
    const historyInserts  = [];
    const statsUpdates    = [];

    for (const row of statsRows) {
      const player = row.players;
      if (!player) continue;

      const { newPrice, delta, performanceScore, newFormScore } = computeNewPrice(
        player.current_price,
        row.raw_stats,
        player.sport,
        player.form_score
      );

      const changePct = parseFloat((delta * 100).toFixed(2));

      priceUpdates.push({
        id:           player.id,
        prev_price:   player.current_price,
        current_price: newPrice,
        form_score:   newFormScore,
        updated_at:   new Date().toISOString(),
      });

      historyInserts.push({
        player_id:   player.id,
        match_id:    matchId,
        price:       newPrice,
        change_pct:  changePct,
      });

      statsUpdates.push({
        id:                row.id,
        performance_score: performanceScore,
      });

      logger.debug(
        `[PriceEngine] ${player.id}: ${player.current_price} → ${newPrice} (${changePct > 0 ? '+' : ''}${changePct}%)`
      );
    }

    // 3. Write to DB in parallel
    const [playersResult, historyResult] = await Promise.all([
      // Upsert player prices
      supabase.from('players').upsert(priceUpdates, { onConflict: 'id' }),

      // Insert price history snapshots
      supabase.from('price_history').insert(historyInserts),

      // Update performance scores on stats rows
      ...statsUpdates.map((s) =>
        supabase
          .from('player_stats')
          .update({ performance_score: s.performance_score })
          .eq('id', s.id)
      ),
    ]);

    if (playersResult.error) throw playersResult.error;
    if (historyResult.error) throw historyResult.error;

    logger.info(`[PriceEngine] Updated ${priceUpdates.length} player prices for match ${matchId}`);

  } catch (err) {
    logger.error(`[PriceEngine] Failed for match ${matchId}:`, err);
    throw err;
  }
};

module.exports = {
  updatePricesAfterMatch,
  computeNewPrice,
  computePerformanceScore,
};
