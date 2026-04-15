-- Migration 001: Extensions and enums
-- Run this first in Supabase SQL editor

-- ── Extensions ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enums ──────────────────────────────────────────────────────────────────
CREATE TYPE sport_type          AS ENUM ('cricket', 'football');
CREATE TYPE season_type         AS ENUM ('weekly', 'monthly', 'mega');
CREATE TYPE season_status       AS ENUM ('upcoming', 'active', 'completed');
CREATE TYPE match_status        AS ENUM ('scheduled', 'live', 'completed', 'cancelled');
CREATE TYPE transaction_type    AS ENUM ('buy', 'sell');
CREATE TYPE coin_type           AS ENUM ('play', 'trophy');
CREATE TYPE coin_action         AS ENUM (
  'signup_bonus',
  'daily_login',
  'watch_ad',
  'referral_reward',
  'referral_bonus',
  'buy_stock',
  'sell_stock',
  'season_prize',
  'store_purchase'
);
CREATE TYPE referral_status     AS ENUM ('pending', 'completed');
CREATE TYPE order_status        AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');
CREATE TYPE notification_type   AS ENUM (
  'price_alert',
  'match_result',
  'season_start',
  'season_end',
  'leaderboard_update',
  'daily_reward',
  'referral',
  'store_order',
  'community'
);
