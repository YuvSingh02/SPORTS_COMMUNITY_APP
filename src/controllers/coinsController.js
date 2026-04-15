// backend/src/controllers/coinsController.js

const { getSupabaseClient } = require('../config/supabase');
const config  = require('../config/env');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const logger  = require('../utils/logger');

/**
 * POST /api/coins/daily-login
 * Awards daily login coins. Enforces one reward per calendar day (IST).
 */
const claimDailyLogin = async (req, res) => {
  const supabase = getSupabaseClient();
  const userId   = req.user.id;

  try {
    const { data: user } = await supabase
      .from('users')
      .select('last_login_date, login_streak, play_coins')
      .eq('id', userId)
      .single();

    const today    = new Date().toISOString().slice(0, 10);  // YYYY-MM-DD
    const lastDate = user?.last_login_date;

    if (lastDate === today) {
      return sendError(res, 'Daily reward already claimed today', 400);
    }

    // Check if streak continues (last login was yesterday)
    const yesterday     = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const streakContinues = lastDate === yesterday;
    const newStreak       = streakContinues ? (user.login_streak ?? 0) + 1 : 1;

    // Streak bonus: every 7 days get an extra 100 coins
    const streakBonus = newStreak % 7 === 0 ? 100 : 0;
    const totalReward = config.coins.dailyLogin + streakBonus;

    // Credit coins via DB function (atomic)
    const { data: newBalance, error: creditErr } = await supabase.rpc('credit_play_coins', {
      p_user_id: userId,
      p_amount:  totalReward,
      p_action:  'daily_login',
      p_reason:  `Day ${newStreak} streak${streakBonus ? ` (streak bonus +${streakBonus})` : ''}`,
    });

    if (creditErr) throw creditErr;

    // Update streak and last login date
    await supabase
      .from('users')
      .update({ last_login_date: today, login_streak: newStreak })
      .eq('id', userId);

    return sendSuccess(res, {
      coins_earned:  totalReward,
      streak_bonus:  streakBonus,
      login_streak:  newStreak,
      new_balance:   newBalance,
    }, `+${totalReward} Play Coins earned!`);

  } catch (err) {
    logger.error('[DailyLogin]', err);
    return sendError(res, 'Failed to claim daily reward');
  }
};

/**
 * POST /api/coins/ad-reward
 * Awards coins for watching a rewarded video ad.
 * Client must send a valid AdMob reward token for verification.
 */
const claimAdReward = async (req, res) => {
  const supabase = getSupabaseClient();
  const userId   = req.user.id;

  // In production: verify the AdMob server-side verification callback
  // For now: trust the client (add SSV webhook in Week 14)
  try {
    const { data: newBalance, error } = await supabase.rpc('credit_play_coins', {
      p_user_id: userId,
      p_amount:  config.coins.watchAd,
      p_action:  'watch_ad',
      p_reason:  'Watched rewarded video ad',
    });

    if (error) throw error;

    // Increment ads_watched for referral tracking
    await supabase.rpc('sql', {
      query: `UPDATE users SET ads_watched = ads_watched + 1 WHERE id = $1`,
      params: [userId],
    }).catch(() => {
      // Fallback if rpc doesn't support raw SQL
      supabase.from('users').select('ads_watched').eq('id', userId).single()
        .then(({ data }) => {
          supabase.from('users').update({ ads_watched: (data?.ads_watched ?? 0) + 1 }).eq('id', userId);
          checkReferralCompletion(supabase, userId, (data?.ads_watched ?? 0) + 1);
        });
    });

    return sendSuccess(res, {
      coins_earned: config.coins.watchAd,
      new_balance:  newBalance,
    }, `+${config.coins.watchAd} Play Coins for watching an ad!`);

  } catch (err) {
    logger.error('[AdReward]', err);
    return sendError(res, 'Failed to claim ad reward');
  }
};

/**
 * GET /api/coins/history
 * Returns paginated coin transaction history.
 */
const getCoinHistory = async (req, res) => {
  const supabase = getSupabaseClient();
  const userId   = req.user.id;
  const page     = parseInt(req.query.page ?? '1', 10);
  const limit    = parseInt(req.query.limit ?? '20', 10);
  const offset   = (page - 1) * limit;

  try {
    const { data, error, count } = await supabase
      .from('coin_history')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return sendSuccess(res, data, 'OK', 200, {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    });

  } catch (err) {
    logger.error('[CoinHistory]', err);
    return sendError(res, 'Failed to fetch coin history');
  }
};

/**
 * Helper: check if a referred user has now watched 5 ads → award referral coins.
 */
const checkReferralCompletion = async (supabase, userId, adsWatched) => {
  if (adsWatched < 5) return;

  const { data: referral } = await supabase
    .from('referrals')
    .select('id, referrer_id, coins_awarded')
    .eq('referred_id', userId)
    .eq('status', 'pending')
    .single();

  if (!referral || referral.coins_awarded) return;

  // Award both parties
  await supabase.rpc('credit_play_coins', {
    p_user_id: referral.referrer_id,
    p_amount:  config.coins.referrerBonus,
    p_action:  'referral_reward',
    p_reason:  'Your referral completed 5 ad views',
    p_ref_id:  referral.id,
  });

  await supabase.rpc('credit_play_coins', {
    p_user_id: userId,
    p_amount:  config.coins.referredBonus,
    p_action:  'referral_bonus',
    p_reason:  'Welcome bonus for completing 5 ad views',
    p_ref_id:  referral.id,
  });

  await supabase
    .from('referrals')
    .update({ status: 'completed', coins_awarded: true, completed_at: new Date().toISOString() })
    .eq('id', referral.id);

  logger.info(`[Referral] Completed referral ${referral.id}`);
};

module.exports = { claimDailyLogin, claimAdReward, getCoinHistory };
