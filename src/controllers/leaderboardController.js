// backend/src/controllers/leaderboardController.js
//
// Returns leaderboard rankings filtered by scope: national, state, or city.
// Joins leaderboard table with users table to include player names.

const { getSupabaseClient } = require('../config/supabase');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * GET /api/leaderboard?scope=national|state|city
 *
 * - national : top 100 by national_rank across all users
 * - state    : top 100 in the requesting user's state
 * - city     : top 100 in the requesting user's city
 *
 * Response: { entries: [...], userEntry: {...} | null }
 */
const getLeaderboard = async (req, res) => {
    const supabase = getSupabaseClient();
    const userId = req.user.id;
    const scope = req.query.scope ?? 'national'; // national | state | city

    if (!['national', 'state', 'city'].includes(scope)) {
        return sendError(res, 'Invalid scope — must be national, state, or city', 400);
    }

    try {
        // 1. Get active season
        const { data: season, error: seasonErr } = await supabase
            .from('seasons')
            .select('id')
            .eq('status', 'active')
            .order('start_date', { ascending: false })
            .limit(1)
            .single();

        if (seasonErr || !season) return sendError(res, 'No active season', 400);

        // 2. Fetch the requesting user's own leaderboard entry (for city/state filter + highlight)
        const { data: selfEntry } = await supabase
            .from('leaderboard')
            .select('*')
            .eq('user_id', userId)
            .eq('season_id', season.id)
            .single();

        // 3. Build query based on scope
        let query = supabase
            .from('leaderboard')
            .select(`
        id,
        user_id,
        city,
        state,
        growth_percent,
        portfolio_value,
        trade_count,
        city_rank,
        state_rank,
        national_rank,
        updated_at,
        users ( name )
      `)
            .eq('season_id', season.id)
            .limit(100);

        if (scope === 'national') {
            query = query.order('national_rank', { ascending: true });
        } else if (scope === 'state') {
            if (!selfEntry?.state) {
                return sendSuccess(res, { entries: [], userEntry: null });
            }
            query = query
                .eq('state', selfEntry.state)
                .order('state_rank', { ascending: true });
        } else if (scope === 'city') {
            if (!selfEntry?.city) {
                return sendSuccess(res, { entries: [], userEntry: null });
            }
            query = query
                .eq('city', selfEntry.city)
                .order('city_rank', { ascending: true });
        }

        const { data: entries, error: entriesErr } = await query;
        if (entriesErr) throw entriesErr;

        // 4. Flatten user name into each entry
        const formatted = (entries ?? []).map((e) => ({
            user_id: e.user_id,
            name: e.users?.name ?? 'Unknown',
            city: e.city,
            state: e.state,
            growth_percent: parseFloat(e.growth_percent ?? 0),
            portfolio_value: e.portfolio_value,
            trade_count: e.trade_count,
            rank: scope === 'national' ? e.national_rank
                : scope === 'state' ? e.state_rank
                    : e.city_rank,
        }));

        return sendSuccess(res, {
            entries: formatted,
            userEntry: selfEntry
                ? {
                    national_rank: selfEntry.national_rank,
                    state_rank: selfEntry.state_rank,
                    city_rank: selfEntry.city_rank,
                }
                : null,
        });

    } catch (err) {
        logger.error('[getLeaderboard]', err);
        return sendError(res, 'Failed to fetch leaderboard — please try again');
    }
};

module.exports = { getLeaderboard };