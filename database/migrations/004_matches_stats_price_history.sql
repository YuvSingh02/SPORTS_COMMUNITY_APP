-- Migration 004: Matches, player stats, price history

-- ── Matches ────────────────────────────────────────────────────────────────
CREATE TABLE public.matches (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id   TEXT          NOT NULL UNIQUE,
  sport         sport_type    NOT NULL,
  team1         TEXT          NOT NULL,
  team2         TEXT          NOT NULL,
  tournament    TEXT,
  venue         TEXT,
  match_date    TIMESTAMPTZ   NOT NULL,
  status        match_status  NOT NULL DEFAULT 'scheduled',
  result        TEXT,          -- free-form result string
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE INDEX idx_matches_sport_date ON public.matches(sport, match_date DESC);
CREATE INDEX idx_matches_status     ON public.matches(status);

-- ── Player stats (per match) ───────────────────────────────────────────────
CREATE TABLE public.player_stats (
  id                UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id         UUID    NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  match_id          UUID    NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  performance_score NUMERIC(6,2) NOT NULL DEFAULT 0, -- 0–100 normalised score
  raw_stats         JSONB,   -- full API payload for auditing
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id, match_id)
);

CREATE INDEX idx_player_stats_player ON public.player_stats(player_id);
CREATE INDEX idx_player_stats_match  ON public.player_stats(match_id);

-- ── Price history (snapshot after each match) ─────────────────────────────
CREATE TABLE public.price_history (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id   UUID        NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  match_id    UUID        REFERENCES public.matches(id),
  price       BIGINT      NOT NULL CHECK (price > 0),
  change_pct  NUMERIC(6,2) NOT NULL DEFAULT 0,  -- % change from previous
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_price_history_player_date ON public.price_history(player_id, recorded_at DESC);
