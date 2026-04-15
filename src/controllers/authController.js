// backend/src/controllers/authController.js

const { getSupabaseClient } = require('../config/supabase');
const config  = require('../config/env');
const { sendSuccess, sendCreated, sendError, sendUnauthorized } = require('../utils/apiResponse');
const logger  = require('../utils/logger');

/**
 * POST /api/auth/register
 * Creates the public.users profile after Supabase Auth signup.
 * Called immediately after the client-side signUp() resolves.
 *
 * Body: { name, city, state, referral_code? }
 */
const registerProfile = async (req, res) => {
  const supabase = getSupabaseClient();
  const userId   = req.user.id;
  const email    = req.user.email;
  const { name, phone, city, state, referral_code } = req.body;
  logger.debug('Register body:', req.body);

  try {
    // Check if profile already exists (idempotent)
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (existing) {
      return sendError(res, 'Profile already created', 409);
    }

    // Resolve referrer if code provided
    let referrerId = null;
    if (referral_code) {
      const { data: referrer } = await supabase
        .from('users')
        .select('id')
        .eq('referral_code', referral_code.toUpperCase())
        .single();

      if (referrer) referrerId = referrer.id;
    }

    // Create profile
    const { data: profile, error: profileErr } = await supabase
      .from('users')
      .insert({
       id:          userId,
        name:        name ? name.trim() : 'User',
        email,
        phone:       phone || null,
        city:        city.trim(),
        state:       state.trim(),
        play_coins:  config.coins.signupBonus,
        trophy_coins: 0,
        referred_by: referrerId,
      })
      .select()
      .single();

    if (profileErr) throw profileErr;

    // Log signup bonus in coin history
    await supabase.from('coin_history').insert({
      user_id:      userId,
      amount:       config.coins.signupBonus,
      coin_type:    'play',
      action:       'signup_bonus',
      reason:       'Welcome to PitchStock!',
      balance_after: config.coins.signupBonus,
    });

    // Create referral record if applicable
    if (referrerId) {
      await supabase.from('referrals').insert({
        referrer_id: referrerId,
        referred_id: userId,
        status:      'pending',
        ads_watched: 0,
      });
    }

    // Add to active season leaderboard baseline
    const { data: activeSeason } = await supabase
      .from('seasons')
      .select('id')
      .eq('status', 'active')
      .order('start_date', { ascending: false })
      .limit(1)
      .single();

    if (activeSeason) {
      await supabase.rpc('refresh_leaderboard_entry', {
        p_user_id:   userId,
        p_season_id: activeSeason.id,
      });
    }

    logger.info(`[Auth] New user registered: ${userId}`);

    return sendCreated(res, profile, 'Welcome to PitchStock! 🏏');

  } catch (err) {
    logger.error('[Auth] registerProfile failed:', err);
    return sendError(res, 'Registration failed — please try again');
  }
};

/**
 * GET /api/auth/profile
 * Returns the current user's full profile.
 */
const getMyProfile = async (req, res) => {
  const supabase = getSupabaseClient();
  const userId   = req.user.id;

  try {
    const { data: profile, error } = await supabase
      .from('users')
      .select('id, name, email, city, state, play_coins, trophy_coins, referral_code, login_streak, ads_watched, avatar_url, created_at')
      .eq('id', userId)
      .single();

    if (error || !profile) return sendError(res, 'Profile not found', 404);

    return sendSuccess(res, profile);

  } catch (err) {
    logger.error('[Auth] getMyProfile failed:', err);
    return sendError(res, 'Failed to fetch profile');
  }
};

/**
 * PATCH /api/auth/profile
 * Update name, avatar_url, fcm_token.
 */
const updateProfile = async (req, res) => {
  const supabase = getSupabaseClient();
  const userId   = req.user.id;
  const { name, avatar_url, fcm_token } = req.body;

  const updates = {};
  if (name)       updates.name       = name.trim();
  if (avatar_url) updates.avatar_url = avatar_url;
  if (fcm_token)  updates.fcm_token  = fcm_token;

  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    return sendSuccess(res, data, 'Profile updated');

  } catch (err) {
    logger.error('[Auth] updateProfile failed:', err);
    return sendError(res, 'Failed to update profile');
  }
};

module.exports = { registerProfile, getMyProfile, updateProfile };
