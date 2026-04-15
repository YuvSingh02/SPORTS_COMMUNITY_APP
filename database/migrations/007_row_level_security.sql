-- Migration 007: Row Level Security (RLS)
-- Ensures users can only read/write their own data

-- ── Enable RLS on all tables ───────────────────────────────────────────────
ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_stats        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_history        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchandise         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_posts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_msgs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications       ENABLE ROW LEVEL SECURITY;

-- ── Helper: current authenticated user ID ─────────────────────────────────
-- auth.uid() is Supabase's built-in function

-- ── users ──────────────────────────────────────────────────────────────────
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Backend service role bypasses RLS (no INSERT policy needed for client)
-- Signup handled server-side via service role key

-- ── players (public read) ─────────────────────────────────────────────────
CREATE POLICY "Anyone can read active players"
  ON public.players FOR SELECT
  USING (is_active = TRUE);

-- ── player_stats (public read) ────────────────────────────────────────────
CREATE POLICY "Anyone can read player stats"
  ON public.player_stats FOR SELECT
  USING (TRUE);

-- ── price_history (public read) ───────────────────────────────────────────
CREATE POLICY "Anyone can read price history"
  ON public.price_history FOR SELECT
  USING (TRUE);

-- ── matches (public read) ─────────────────────────────────────────────────
CREATE POLICY "Anyone can read matches"
  ON public.matches FOR SELECT
  USING (TRUE);

-- ── seasons (public read) ─────────────────────────────────────────────────
CREATE POLICY "Anyone can read seasons"
  ON public.seasons FOR SELECT
  USING (TRUE);

-- ── portfolios ────────────────────────────────────────────────────────────
CREATE POLICY "Users can read own portfolio"
  ON public.portfolios FOR SELECT
  USING (user_id = auth.uid());

-- ── transactions ──────────────────────────────────────────────────────────
CREATE POLICY "Users can read own transactions"
  ON public.transactions FOR SELECT
  USING (user_id = auth.uid());

-- ── coin_history ──────────────────────────────────────────────────────────
CREATE POLICY "Users can read own coin history"
  ON public.coin_history FOR SELECT
  USING (user_id = auth.uid());

-- ── leaderboard (public read) ─────────────────────────────────────────────
CREATE POLICY "Anyone can read leaderboard"
  ON public.leaderboard FOR SELECT
  USING (TRUE);

-- ── referrals ─────────────────────────────────────────────────────────────
CREATE POLICY "Users can read own referrals"
  ON public.referrals FOR SELECT
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

-- ── merchandise (public read) ─────────────────────────────────────────────
CREATE POLICY "Anyone can read active merchandise"
  ON public.merchandise FOR SELECT
  USING (is_active = TRUE);

-- ── orders ────────────────────────────────────────────────────────────────
CREATE POLICY "Users can read own orders"
  ON public.orders FOR SELECT
  USING (user_id = auth.uid());

-- ── channels (public read for active) ────────────────────────────────────
CREATE POLICY "Anyone can read active channels"
  ON public.channels FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Owners can update their channel"
  ON public.channels FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ── channel_subscriptions ─────────────────────────────────────────────────
CREATE POLICY "Users can read own subscriptions"
  ON public.channel_subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can subscribe to channels"
  ON public.channel_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unsubscribe from channels"
  ON public.channel_subscriptions FOR DELETE
  USING (user_id = auth.uid());

-- ── channel_posts (public read) ───────────────────────────────────────────
CREATE POLICY "Anyone can read channel posts"
  ON public.channel_posts FOR SELECT
  USING (TRUE);

CREATE POLICY "Channel owners can insert posts"
  ON public.channel_posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.channels
      WHERE id = channel_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Channel owners can delete own posts"
  ON public.channel_posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.channels
      WHERE id = channel_id AND owner_id = auth.uid()
    )
  );

-- ── discussion_msgs ───────────────────────────────────────────────────────
CREATE POLICY "Anyone can read non-deleted messages"
  ON public.discussion_msgs FOR SELECT
  USING (is_deleted = FALSE);

CREATE POLICY "Authenticated users can post messages"
  ON public.discussion_msgs FOR INSERT
  WITH CHECK (user_id = auth.uid() AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can soft-delete own messages"
  ON public.discussion_msgs FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── content_reports ───────────────────────────────────────────────────────
CREATE POLICY "Users can submit reports"
  ON public.content_reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can read own reports"
  ON public.content_reports FOR SELECT
  USING (reporter_id = auth.uid());

-- ── notifications ─────────────────────────────────────────────────────────
CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can mark own notifications read"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
