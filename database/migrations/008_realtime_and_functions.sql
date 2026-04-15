-- Migration 008: Realtime + useful DB functions

-- ── Enable Supabase Realtime on key tables ────────────────────────────────
-- Run in Supabase Dashboard > Database > Replication
-- OR via SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.price_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leaderboard;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_msgs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_posts;

-- ── Function: get user portfolio value for a season ───────────────────────
CREATE OR REPLACE FUNCTION get_portfolio_value(p_user_id UUID, p_season_id UUID)
RETURNS BIGINT LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(port.shares_owned * pl.current_price), 0)
  FROM public.portfolios port
  JOIN public.players pl ON pl.id = port.player_id
  WHERE port.user_id = p_user_id
    AND port.season_id = p_season_id
    AND port.shares_owned > 0;
$$;

-- ── Function: get portfolio growth percent ────────────────────────────────
-- Growth = (current_value - starting_coins) / starting_coins * 100
-- starting_coins is always 1000 per season rules
CREATE OR REPLACE FUNCTION get_portfolio_growth(p_user_id UUID, p_season_id UUID)
RETURNS NUMERIC LANGUAGE sql STABLE AS $$
  SELECT ROUND(
    (get_portfolio_value(p_user_id, p_season_id)::NUMERIC - 1000) / 1000 * 100,
    4
  );
$$;

-- ── Function: deduct play coins (atomic, prevents negative balance) ────────
CREATE OR REPLACE FUNCTION deduct_play_coins(
  p_user_id UUID,
  p_amount   BIGINT,
  p_action   coin_action,
  p_reason   TEXT DEFAULT NULL,
  p_ref_id   UUID DEFAULT NULL
)
RETURNS BIGINT LANGUAGE plpgsql AS $$
DECLARE
  v_new_balance BIGINT;
BEGIN
  UPDATE public.users
  SET play_coins = play_coins - p_amount
  WHERE id = p_user_id AND play_coins >= p_amount
  RETURNING play_coins INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient play coins' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.coin_history(user_id, amount, coin_type, action, reason, balance_after, ref_id)
  VALUES (p_user_id, -p_amount, 'play', p_action, p_reason, v_new_balance, p_ref_id);

  RETURN v_new_balance;
END;
$$;

-- ── Function: credit play coins ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION credit_play_coins(
  p_user_id UUID,
  p_amount   BIGINT,
  p_action   coin_action,
  p_reason   TEXT DEFAULT NULL,
  p_ref_id   UUID DEFAULT NULL
)
RETURNS BIGINT LANGUAGE plpgsql AS $$
DECLARE
  v_new_balance BIGINT;
BEGIN
  UPDATE public.users
  SET play_coins = play_coins + p_amount
  WHERE id = p_user_id
  RETURNING play_coins INTO v_new_balance;

  INSERT INTO public.coin_history(user_id, amount, coin_type, action, reason, balance_after, ref_id)
  VALUES (p_user_id, p_amount, 'play', p_action, p_reason, v_new_balance, p_ref_id);

  RETURN v_new_balance;
END;
$$;

-- ── Function: credit trophy coins ────────────────────────────────────────
CREATE OR REPLACE FUNCTION credit_trophy_coins(
  p_user_id UUID,
  p_amount   BIGINT,
  p_action   coin_action,
  p_reason   TEXT DEFAULT NULL,
  p_ref_id   UUID DEFAULT NULL
)
RETURNS BIGINT LANGUAGE plpgsql AS $$
DECLARE
  v_new_balance BIGINT;
BEGIN
  UPDATE public.users
  SET trophy_coins = trophy_coins + p_amount
  WHERE id = p_user_id
  RETURNING trophy_coins INTO v_new_balance;

  INSERT INTO public.coin_history(user_id, amount, coin_type, action, reason, balance_after, ref_id)
  VALUES (p_user_id, p_amount, 'trophy', p_action, p_reason, v_new_balance, p_ref_id);

  RETURN v_new_balance;
END;
$$;

-- ── Function: recalculate and upsert leaderboard entry ───────────────────
CREATE OR REPLACE FUNCTION refresh_leaderboard_entry(p_user_id UUID, p_season_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_user    RECORD;
  v_growth  NUMERIC;
  v_value   BIGINT;
  v_trades  INT;
BEGIN
  SELECT city, state INTO v_user FROM public.users WHERE id = p_user_id;
  v_growth := get_portfolio_growth(p_user_id, p_season_id);
  v_value  := get_portfolio_value(p_user_id, p_season_id);

  SELECT COUNT(*) INTO v_trades
  FROM public.transactions
  WHERE user_id = p_user_id AND season_id = p_season_id;

  INSERT INTO public.leaderboard(user_id, season_id, city, state, growth_percent, portfolio_value, trade_count)
  VALUES (p_user_id, p_season_id, v_user.city, v_user.state, v_growth, v_value, v_trades)
  ON CONFLICT (user_id, season_id)
  DO UPDATE SET
    growth_percent  = EXCLUDED.growth_percent,
    portfolio_value = EXCLUDED.portfolio_value,
    trade_count     = EXCLUDED.trade_count,
    updated_at      = NOW();
END;
$$;
