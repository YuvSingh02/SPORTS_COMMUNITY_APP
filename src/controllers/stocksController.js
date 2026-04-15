// backend/src/controllers/stocksController.js

const { getSupabaseClient } = require('../config/supabase');
const { sendSuccess, sendError, sendNotFound, sendForbidden } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * POST /api/stocks/buy
 * Body: { player_id, shares }
 *
 * Rules:
 * - Must be an active season
 * - User must have enough play coins
 * - Deduct coins atomically via DB function
 * - Upsert portfolio row (avg buy price recalculated)
 * - Insert transaction record
 * - Refresh leaderboard entry
 */
const buyStock = async (req, res) => {
  const supabase = getSupabaseClient();
  const userId = req.user.id;
  const { player_id, shares } = req.body;

  try {
    // 1. Validate shares amount
    if (!Number.isInteger(shares) || shares < 1 || shares > 1000) {
      return sendError(res, 'Shares must be between 1 and 1000', 400);
    }

    // 2. Fetch player price
    const { data: player, error: playerErr } = await supabase
      .from('players')
      .select('id, name, current_price, is_active')
      .eq('id', player_id)
      .single();

    if (playerErr || !player) return sendNotFound(res, 'Player not found');
    if (!player.is_active) return sendError(res, 'Player is not available for trading', 400);

    // 3. Get active season
    const { data: season, error: seasonErr } = await supabase
      .from('seasons')
      .select('id')
      .eq('status', 'active')
      .order('start_date', { ascending: false })
      .limit(1)
      .single();

    if (seasonErr || !season) return sendError(res, 'No active season', 400);

    const totalCost = player.current_price * shares;

    // 4. Deduct coins atomically (throws if insufficient)
    const { data: newBalance, error: deductErr } = await supabase.rpc('deduct_play_coins', {
      p_user_id: userId,
      p_amount: totalCost,
      p_action: 'buy_stock',
      p_reason: `Bought ${shares} share(s) of ${player.name}`,
      p_ref_id: player.id,
    });

    if (deductErr) {
      if (deductErr.message?.includes('Insufficient')) {
        return sendError(res, 'Not enough Play Coins', 400);
      }
      throw deductErr;
    }

    // 5. Upsert portfolio (recalculate weighted avg buy price)
    const { data: existing } = await supabase
      .from('portfolios')
      .select('shares_owned, avg_buy_price')
      .eq('user_id', userId)
      .eq('player_id', player_id)
      .eq('season_id', season.id)
      .single();

    let newShares = shares;
    let newAvgPrice = player.current_price;

    if (existing) {
      newShares = existing.shares_owned + shares;
      newAvgPrice = Math.round(
        (existing.shares_owned * existing.avg_buy_price + shares * player.current_price) / newShares
      );
    }

    const { error: portfolioErr } = await supabase
      .from('portfolios')
      .upsert(
        {
          user_id: userId,
          player_id,
          season_id: season.id,
          shares_owned: newShares,
          avg_buy_price: newAvgPrice,
        },
        { onConflict: 'user_id,player_id,season_id' }
      );

    if (portfolioErr) throw portfolioErr;

    // 6. Record transaction
    const { error: txErr } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        player_id,
        season_id: season.id,
        type: 'buy',
        shares,
        price_per_share: player.current_price,
        total_coins: totalCost,
      });

    if (txErr) throw txErr;

    // 7. Refresh leaderboard (fire and forget — don't block response)
    supabase.rpc('refresh_leaderboard_entry', {
      p_user_id: userId,
      p_season_id: season.id,
    }).then(null, (err) => logger.warn('[BuyStock] leaderboard refresh failed:', err.message));

    return sendSuccess(res, {
      shares_bought: shares,
      price_per_share: player.current_price,
      total_cost: totalCost,
      new_balance: newBalance,
      new_shares_owned: newShares,
      avg_buy_price: newAvgPrice,
    }, `Bought ${shares} share(s) of ${player.name}`);

  } catch (err) {
    logger.error('[BuyStock]', err);
    return sendError(res, 'Trade failed — please try again');
  }
};

/**
 * POST /api/stocks/sell
 * Body: { player_id, shares }
 *
 * Rules:
 * - User must own enough shares in the active season portfolio
 * - Credit coins based on CURRENT price (not avg buy price)
 * - Update portfolio shares
 */
const sellStock = async (req, res) => {
  const supabase = getSupabaseClient();
  const userId = req.user.id;
  const { player_id, shares } = req.body;

  try {
    if (!Number.isInteger(shares) || shares < 1 || shares > 1000) {
      return sendError(res, 'Shares must be between 1 and 1000', 400);
    }

    // 1. Fetch player
    const { data: player, error: playerErr } = await supabase
      .from('players')
      .select('id, name, current_price, is_active')
      .eq('id', player_id)
      .single();

    if (playerErr || !player) return sendNotFound(res, 'Player not found');

    // 2. Get active season
    const { data: season } = await supabase
      .from('seasons')
      .select('id')
      .eq('status', 'active')
      .order('start_date', { ascending: false })
      .limit(1)
      .single();

    if (!season) return sendError(res, 'No active season', 400);

    // 3. Fetch portfolio holding
    const { data: holding, error: holdingErr } = await supabase
      .from('portfolios')
      .select('shares_owned, avg_buy_price')
      .eq('user_id', userId)
      .eq('player_id', player_id)
      .eq('season_id', season.id)
      .single();

    if (holdingErr || !holding || holding.shares_owned < shares) {
      return sendError(res, `You only own ${holding?.shares_owned ?? 0} share(s) of this player`, 400);
    }

    const saleValue = player.current_price * shares;
    const newShares = holding.shares_owned - shares;
    const profit = (player.current_price - holding.avg_buy_price) * shares;

    // 4. Update portfolio
    const { error: portfolioErr } = await supabase
      .from('portfolios')
      .update({ shares_owned: newShares })
      .eq('user_id', userId)
      .eq('player_id', player_id)
      .eq('season_id', season.id);

    if (portfolioErr) throw portfolioErr;

    // 5. Credit coins
    const { data: newBalance, error: creditErr } = await supabase.rpc('credit_play_coins', {
      p_user_id: userId,
      p_amount: saleValue,
      p_action: 'sell_stock',
      p_reason: `Sold ${shares} share(s) of ${player.name}`,
      p_ref_id: player.id,
    });

    if (creditErr) throw creditErr;

    // 6. Record transaction
    await supabase.from('transactions').insert({
      user_id: userId,
      player_id,
      season_id: season.id,
      type: 'sell',
      shares,
      price_per_share: player.current_price,
      total_coins: saleValue,
    });

    // 7. Refresh leaderboard
    supabase.rpc('refresh_leaderboard_entry', {
      p_user_id: userId,
      p_season_id: season.id,
    }).then(null, () => { });

    return sendSuccess(res, {
      shares_sold: shares,
      price_per_share: player.current_price,
      sale_value: saleValue,
      profit_or_loss: profit,
      new_balance: newBalance,
      remaining_shares: newShares,
    }, `Sold ${shares} share(s) of ${player.name}`);

  } catch (err) {
    logger.error('[SellStock]', err);
    return sendError(res, 'Trade failed — please try again');
  }
};

module.exports = { buyStock, sellStock };
