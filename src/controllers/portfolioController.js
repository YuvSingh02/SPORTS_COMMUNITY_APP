// backend/src/controllers/portfolioController.js

const { getSupabaseClient } = require('../config/supabase');
const { sendSuccess, sendError, sendNotFound } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * GET /api/portfolio/holding/:playerId
 * Returns the user's holding for a single player in the active season.
 */
const getHolding = async (req, res) => {
    const supabase = getSupabaseClient();
    const userId = req.user.id;
    const { playerId } = req.params;

    try {
        const { data: season, error: seasonErr } = await supabase
            .from('seasons')
            .select('id')
            .eq('status', 'active')
            .order('start_date', { ascending: false })
            .limit(1)
            .single();

        if (seasonErr || !season) return sendError(res, 'No active season', 400);

        const { data: holding, error: holdingErr } = await supabase
            .from('portfolios')
            .select('shares_owned, avg_buy_price')
            .eq('user_id', userId)
            .eq('player_id', playerId)
            .eq('season_id', season.id)
            .single();

        if (holdingErr || !holding) return sendNotFound(res, 'No holding found for this player');

        const { data: player, error: playerErr } = await supabase
            .from('players')
            .select('name, current_price')
            .eq('id', playerId)
            .single();

        if (playerErr || !player) return sendNotFound(res, 'Player not found');

        return sendSuccess(res, {
            shares_owned: holding.shares_owned,
            avg_buy_price: holding.avg_buy_price,
            current_price: player.current_price,
            player_name: player.name,
        });

    } catch (err) {
        logger.error('[getHolding]', err);
        return sendError(res, 'Failed to fetch holding — please try again');
    }
};

/**
 * GET /api/portfolio?season_id=...  (season_id optional — defaults to active season)
 *
 * Returns all holdings for the authenticated user with:
 *   - player name, country, current price
 *   - shares owned, avg buy price
 *   - current value and profit/loss per holding
 *   - total portfolio value and overall growth percent
 */
const getPortfolio = async (req, res) => {
    const supabase = getSupabaseClient();
    const userId = req.user.id;

    try {
        // 1. Resolve season — use provided season_id or fall back to active season
        let seasonId = req.query.season_id;

        if (!seasonId) {
            const { data: season, error: seasonErr } = await supabase
                .from('seasons')
                .select('id')
                .eq('status', 'active')
                .order('start_date', { ascending: false })
                .limit(1)
                .single();

            if (seasonErr || !season) return sendError(res, 'No active season', 400);
            seasonId = season.id;
        }

        // 2. Fetch all holdings for this user in the season
        const { data: portfolioRows, error: portfolioErr } = await supabase
            .from('portfolios')
            .select('player_id, shares_owned, avg_buy_price')
            .eq('user_id', userId)
            .eq('season_id', seasonId)
            .gt('shares_owned', 0);  // exclude fully-sold positions

        if (portfolioErr) throw portfolioErr;

        if (!portfolioRows || portfolioRows.length === 0) {
            return sendSuccess(res, {
                holdings: [],
                totalValue: 0,
                totalInvested: 0,
                growthPercent: 0,
            });
        }

        // 3. Fetch player details for each holding
        const playerIds = portfolioRows.map((h) => h.player_id);

        const { data: players, error: playersErr } = await supabase
            .from('players')
            .select('id, name, country, current_price')
            .in('id', playerIds);

        if (playersErr) throw playersErr;

        // 4. Map players by id for quick lookup
        const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));

        // 5. Build enriched holdings array
        let totalValue = 0;
        let totalInvested = 0;

        const holdings = portfolioRows.map((h) => {
            const player = playerMap[h.player_id] ?? {};
            const currentValue = (player.current_price ?? 0) * h.shares_owned;
            const invested = h.avg_buy_price * h.shares_owned;
            const profitOrLoss = currentValue - invested;

            totalValue += currentValue;
            totalInvested += invested;

            return {
                player_id: h.player_id,
                player_name: player.name,
                country: player.country,
                current_price: player.current_price,
                shares_owned: h.shares_owned,
                avg_buy_price: h.avg_buy_price,
                current_value: Math.round(currentValue),
                profit_or_loss: Math.round(profitOrLoss),
            };
        });

        // 6. Overall growth percent (avoid divide-by-zero)
        const growthPercent = totalInvested > 0
            ? parseFloat((((totalValue - totalInvested) / totalInvested) * 100).toFixed(2))
            : 0;

        return sendSuccess(res, {
            holdings,
            totalValue: Math.round(totalValue),
            totalInvested: Math.round(totalInvested),
            growthPercent,
        });

    } catch (err) {
        logger.error('[getPortfolio]', err);
        return sendError(res, 'Failed to fetch portfolio — please try again');
    }
};

module.exports = { getHolding, getPortfolio };