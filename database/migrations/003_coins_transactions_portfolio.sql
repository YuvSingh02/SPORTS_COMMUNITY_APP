-- Migration 003: Coins, transactions, portfolio

-- ── Seasons ────────────────────────────────────────────────────────────────
-- Defined before portfolios because portfolios reference it
CREATE TABLE public.seasons (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT          NOT NULL,
  type          season_type   NOT NULL,
  start_date    TIMESTAMPTZ   NOT NULL,
  end_date      TIMESTAMPTZ   NOT NULL,
  status        season_status NOT NULL DEFAULT 'upcoming',
  tournament    TEXT,          -- e.g. "IPL 2025", "World Cup 2025"
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT no_overlapping_seasons UNIQUE (type, start_date)
);

-- ── Coin history ───────────────────────────────────────────────────────────
CREATE TABLE public.coin_history (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount      BIGINT      NOT NULL,               -- positive = credit, negative = debit
  coin_type   coin_type   NOT NULL DEFAULT 'play',
  action      coin_action NOT NULL,
  reason      TEXT,
  balance_after BIGINT    NOT NULL,
  ref_id      UUID,                               -- generic reference (match_id, order_id, etc.)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coin_history_user  ON public.coin_history(user_id);
CREATE INDEX idx_coin_history_date  ON public.coin_history(created_at DESC);

-- ── Portfolios ────────────────────────────────────────────────────────────
CREATE TABLE public.portfolios (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  player_id       UUID        NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  season_id       UUID        NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  shares_owned    INT         NOT NULL DEFAULT 0 CHECK (shares_owned >= 0),
  avg_buy_price   BIGINT      NOT NULL DEFAULT 0 CHECK (avg_buy_price >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, player_id, season_id)
);

CREATE TRIGGER portfolios_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE INDEX idx_portfolios_user_season ON public.portfolios(user_id, season_id);

-- ── Transactions ──────────────────────────────────────────────────────────
CREATE TABLE public.transactions (
  id            UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID              NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  player_id     UUID              NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  season_id     UUID              NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  type          transaction_type  NOT NULL,
  shares        INT               NOT NULL CHECK (shares > 0),
  price_per_share BIGINT          NOT NULL CHECK (price_per_share > 0),
  total_coins   BIGINT            NOT NULL,       -- shares * price_per_share
  created_at    TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_user   ON public.transactions(user_id);
CREATE INDEX idx_transactions_player ON public.transactions(player_id);
CREATE INDEX idx_transactions_date   ON public.transactions(created_at DESC);
