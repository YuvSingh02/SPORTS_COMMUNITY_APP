// backend/src/services/seasonService.js

const { getSupabaseClient } = require('../config/supabase');
const config  = require('../config/env');
const logger  = require('../utils/logger');
const { sendBulkNotification } = require('./firebaseService');

// ── Check and auto-end expired seasons ────────────────────────────────────
const checkAndEndSeasons = async () => {
  const supabase = getSupabaseClient();

  const { data: expiredSeasons, error } = await supabase
    .from('seasons')
    .select('id, name, type')
    .eq('status', 'active')
    .lt('end_date', new Date().toISOString());

  if (error) throw error;

  for (const season of expiredSeasons ?? []) {
    logger.info(`[SeasonService] Ending season: ${season.name}`);
    await endSeason(season.id);
  }
};

/**
 * End a season:
 * 1. Rank all participants nationally, by state, by city
 * 2. Award trophy coins to top 3 in each scope
 * 3. Mark season completed
 * 4. Push notification to all participants
 */
const endSeason = async (seasonId) => {
  const supabase = getSupabaseClient();

  // 1. Finalise all leaderboard entries
  await finaliseLeaderboard(seasonId);

  // 2. Assign ranks
  await assignRanks(seasonId);

  // 3. Award trophy coins to winners
  await awardTrophyCoins(seasonId);

  // 4. Mark season complete
  const { error } = await supabase
    .from('seasons')
    .update({ status: 'completed' })
    .eq('id', seasonId);

  if (error) throw error;

  // 5. Notify all participants
  await notifySeasonEnd(seasonId);

  logger.info(`[SeasonService] Season ${seasonId} completed`);
};

/**
 * Recompute leaderboard rows for every user who traded in this season.
 */
const finaliseLeaderboard = async (seasonId) => {
  const supabase = getSupabaseClient();

  const { data: participants } = await supabase
    .from('transactions')
    .select('user_id')
    .eq('season_id', seasonId);

  const uniqueUserIds = [...new Set((participants ?? []).map((p) => p.user_id))];

  for (const userId of uniqueUserIds) {
    await supabase.rpc('refresh_leaderboard_entry', {
      p_user_id:  userId,
      p_season_id: seasonId,
    });
  }

  logger.info(`[SeasonService] Finalised ${uniqueUserIds.length} leaderboard entries`);
};

/**
 * Assign city / state / national ranks using window functions.
 */
const assignRanks = async (seasonId) => {
  const supabase = getSupabaseClient();

  // National rank
  const { data: national } = await supabase
    .from('leaderboard')
    .select('id, growth_percent, trade_count')
    .eq('season_id', seasonId)
    .order('growth_percent', { ascending: false })
    .order('trade_count',    { ascending: false });

  if (!national?.length) return;

  // Assign national ranks sequentially
  for (let i = 0; i < national.length; i++) {
    await supabase
      .from('leaderboard')
      .update({ national_rank: i + 1 })
      .eq('id', national[i].id);
  }

  // State ranks (group by state)
  const { data: byState } = await supabase
    .from('leaderboard')
    .select('id, state, growth_percent, trade_count')
    .eq('season_id', seasonId)
    .order('state')
    .order('growth_percent', { ascending: false });

  let stateGroup = null;
  let stateRank  = 0;
  for (const row of byState ?? []) {
    if (row.state !== stateGroup) { stateGroup = row.state; stateRank = 0; }
    stateRank++;
    await supabase.from('leaderboard').update({ state_rank: stateRank }).eq('id', row.id);
  }

  // City ranks
  const { data: byCity } = await supabase
    .from('leaderboard')
    .select('id, city, growth_percent, trade_count')
    .eq('season_id', seasonId)
    .order('city')
    .order('growth_percent', { ascending: false });

  let cityGroup = null;
  let cityRank  = 0;
  for (const row of byCity ?? []) {
    if (row.city !== cityGroup) { cityGroup = row.city; cityRank = 0; }
    cityRank++;
    await supabase.from('leaderboard').update({ city_rank: cityRank }).eq('id', row.id);
  }

  logger.info(`[SeasonService] Ranks assigned for season ${seasonId}`);
};

/**
 * Award trophy coins to top 3 nationally, by state, and by city.
 */
const awardTrophyCoins = async (seasonId) => {
  const supabase = getSupabaseClient();
  const prizes   = config.trophyCoins;

  const scopeQueries = [
    { scope: 'national', rankCol: 'national_rank', filter: {}              },
    { scope: 'state',    rankCol: 'state_rank',    filter: {}              },
    { scope: 'city',     rankCol: 'city_rank',     filter: {}              },
  ];

  for (const { rankCol } of scopeQueries) {
    const { data: winners } = await supabase
      .from('leaderboard')
      .select(`user_id, ${rankCol}`)
      .eq('season_id', seasonId)
      .lte(rankCol, 3)
      .not(rankCol, 'is', null);

    for (const winner of winners ?? []) {
      const rank   = winner[rankCol];
      const amount = rank === 1 ? prizes.firstPlace : rank === 2 ? prizes.secondPlace : prizes.thirdPlace;

      await supabase.rpc('credit_trophy_coins', {
        p_user_id: winner.user_id,
        p_amount:  amount,
        p_action:  'season_prize',
        p_reason:  `Season ${seasonId} — rank ${rank}`,
        p_ref_id:  seasonId,
      });

      logger.info(`[SeasonService] Awarded ${amount} trophy coins to user ${winner.user_id} (rank ${rank})`);
    }
  }
};

/**
 * Push a season-end notification to all participants.
 */
const notifySeasonEnd = async (seasonId) => {
  const supabase = getSupabaseClient();

  const { data: season } = await supabase
    .from('seasons')
    .select('name')
    .eq('id', seasonId)
    .single();

  const { data: participants } = await supabase
    .from('leaderboard')
    .select('users!inner(fcm_token)')
    .eq('season_id', seasonId)
    .not('users.fcm_token', 'is', null);

  const tokens = (participants ?? [])
    .map((p) => p.users?.fcm_token)
    .filter(Boolean);

  if (tokens.length) {
    await sendBulkNotification(tokens, {
      title: '🏆 Season Over!',
      body:  `${season?.name} has ended. Check the leaderboard to see your final rank!`,
    });
  }
};

/**
 * Start a new season and credit starting coins to all active users.
 */
const startSeason = async (seasonData) => {
  const supabase = getSupabaseClient();

  const { data: season, error } = await supabase
    .from('seasons')
    .insert(seasonData)
    .select()
    .single();

  if (error) throw error;

  // Credit 1000 play coins to every active user
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('is_active', true);

  for (const user of users ?? []) {
    await supabase.rpc('credit_play_coins', {
      p_user_id: user.id,
      p_amount:  config.coins.seasonStartCoins,
      p_action:  'season_prize',  // reusing closest enum value
      p_reason:  `Season start: ${season.name}`,
      p_ref_id:  season.id,
    });
  }

  logger.info(`[SeasonService] Started season ${season.id}, credited coins to ${users?.length} users`);
  return season;
};

module.exports = {
  checkAndEndSeasons,
  endSeason,
  startSeason,
  finaliseLeaderboard,
};
