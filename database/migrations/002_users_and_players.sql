-- Migration 002: Users and players

-- ── Users ──────────────────────────────────────────────────────────────────
-- Extends Supabase auth.users — do NOT store passwords here
CREATE TABLE public.users (
  id                UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  email             TEXT        NOT NULL UNIQUE,
  avatar_url        TEXT,
  city              TEXT        NOT NULL,
  state             TEXT        NOT NULL,
  play_coins        BIGINT      NOT NULL DEFAULT 0 CHECK (play_coins >= 0),
  trophy_coins      BIGINT      NOT NULL DEFAULT 0 CHECK (trophy_coins >= 0),
  referral_code     TEXT        NOT NULL UNIQUE,
  referred_by       UUID        REFERENCES public.users(id),
  ads_watched       INT         NOT NULL DEFAULT 0,
  login_streak      INT         NOT NULL DEFAULT 0,
  last_login_date   DATE,
  fcm_token         TEXT,
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Referral code generation trigger ──────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := upper(substring(encode(gen_random_bytes(4), 'hex'), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_referral_code
  BEFORE INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION generate_referral_code();

-- ── Auto-update updated_at ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ── Players ────────────────────────────────────────────────────────────────
CREATE TABLE public.players (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id     TEXT        NOT NULL UNIQUE,  -- ID from cricket/football API
  name            TEXT        NOT NULL,
  sport           sport_type  NOT NULL,
  team            TEXT        NOT NULL,
  country         TEXT        NOT NULL,
  position        TEXT,                          -- e.g. "Batsman", "Striker"
  image_url       TEXT,
  current_price   BIGINT      NOT NULL DEFAULT 100 CHECK (current_price > 0),
  prev_price      BIGINT      NOT NULL DEFAULT 100,
  form_score      NUMERIC(5,2) NOT NULL DEFAULT 50.0 CHECK (form_score BETWEEN 0 AND 100),
  total_shares    BIGINT      NOT NULL DEFAULT 1000000, -- fixed supply per player
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Index for fast sport/team filtering
CREATE INDEX idx_players_sport ON public.players(sport);
CREATE INDEX idx_players_team  ON public.players(team);
CREATE INDEX idx_players_active ON public.players(is_active);
