-- Migration 005: Leaderboard, referrals, store, orders

-- ── Leaderboard ────────────────────────────────────────────────────────────
CREATE TABLE public.leaderboard (
  id              UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID    NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  season_id       UUID    NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  city            TEXT    NOT NULL,
  state           TEXT    NOT NULL,
  growth_percent  NUMERIC(10,4) NOT NULL DEFAULT 0,
  portfolio_value BIGINT  NOT NULL DEFAULT 0,
  trade_count     INT     NOT NULL DEFAULT 0,
  city_rank       INT,
  state_rank      INT,
  national_rank   INT,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, season_id)
);

CREATE INDEX idx_leaderboard_season_national ON public.leaderboard(season_id, national_rank ASC NULLS LAST);
CREATE INDEX idx_leaderboard_season_city     ON public.leaderboard(season_id, city, city_rank ASC NULLS LAST);
CREATE INDEX idx_leaderboard_season_state    ON public.leaderboard(season_id, state, state_rank ASC NULLS LAST);

-- ── Referrals ──────────────────────────────────────────────────────────────
CREATE TABLE public.referrals (
  id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id     UUID            NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referred_id     UUID            NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status          referral_status NOT NULL DEFAULT 'pending',
  ads_watched     INT             NOT NULL DEFAULT 0,   -- track referred user's ad count
  coins_awarded   BOOLEAN         NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  UNIQUE(referrer_id, referred_id)
);

CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON public.referrals(referred_id);

-- ── Merchandise ────────────────────────────────────────────────────────────
CREATE TABLE public.merchandise (
  id                UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT    NOT NULL,
  description       TEXT,
  category          TEXT    NOT NULL,   -- e.g. "apparel", "equipment", "tickets"
  image_url         TEXT,
  play_coin_price   BIGINT  DEFAULT NULL,   -- NULL means not available for play coins
  trophy_coin_price BIGINT  DEFAULT NULL,   -- NULL means not available for trophy coins
  stock_qty         INT     NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT must_have_price CHECK (
    play_coin_price IS NOT NULL OR trophy_coin_price IS NOT NULL
  )
);

CREATE TRIGGER merchandise_updated_at
  BEFORE UPDATE ON public.merchandise
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ── Orders ────────────────────────────────────────────────────────────────
CREATE TABLE public.orders (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID          NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id      UUID          NOT NULL REFERENCES public.merchandise(id),
  coins_spent     BIGINT        NOT NULL CHECK (coins_spent > 0),
  coin_type       coin_type     NOT NULL,
  status          order_status  NOT NULL DEFAULT 'pending',
  delivery_name   TEXT          NOT NULL,
  delivery_phone  TEXT          NOT NULL,
  delivery_address TEXT         NOT NULL,
  delivery_city   TEXT          NOT NULL,
  delivery_state  TEXT          NOT NULL,
  delivery_pincode TEXT         NOT NULL,
  tracking_id     TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE INDEX idx_orders_user   ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
