-- Migration 006: Community and notifications

-- ── Channels ──────────────────────────────────────────────────────────────
CREATE TABLE public.channels (
  id              UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id        UUID    NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name            TEXT    NOT NULL,
  description     TEXT,
  avatar_url      TEXT,
  subscribers     INT     NOT NULL DEFAULT 0 CHECK (subscribers >= 0),
  is_monetized    BOOLEAN NOT NULL DEFAULT FALSE,  -- unlocked at 100 subscribers
  ad_revenue_pct  NUMERIC(4,2) NOT NULL DEFAULT 40.0,  -- creator's % cut
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER channels_updated_at
  BEFORE UPDATE ON public.channels
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE INDEX idx_channels_owner ON public.channels(owner_id);

-- ── Channel subscriptions ──────────────────────────────────────────────────
CREATE TABLE public.channel_subscriptions (
  channel_id  UUID        NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (channel_id, user_id)
);

-- Auto-update subscribers count
CREATE OR REPLACE FUNCTION update_subscriber_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.channels SET subscribers = subscribers + 1
    WHERE id = NEW.channel_id;

    -- Auto-unlock monetization at 100 subscribers
    UPDATE public.channels SET is_monetized = TRUE
    WHERE id = NEW.channel_id AND subscribers >= 100;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.channels SET subscribers = GREATEST(0, subscribers - 1)
    WHERE id = OLD.channel_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER channel_subscription_count
  AFTER INSERT OR DELETE ON public.channel_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_subscriber_count();

-- ── Channel posts (owner only) ─────────────────────────────────────────────
CREATE TABLE public.channel_posts (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id  UUID    NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  content     TEXT    NOT NULL,
  image_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_channel_posts_channel_date ON public.channel_posts(channel_id, created_at DESC);

-- ── Discussion messages (anyone can post) ─────────────────────────────────
CREATE TABLE public.discussion_msgs (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id  UUID    NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id     UUID    NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message     TEXT    NOT NULL CHECK (length(message) <= 1000),
  is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_discussion_channel_date ON public.discussion_msgs(channel_id, created_at DESC);
CREATE INDEX idx_discussion_user         ON public.discussion_msgs(user_id);

-- ── Content reports ────────────────────────────────────────────────────────
CREATE TABLE public.content_reports (
  id            UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id   UUID    NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content_type  TEXT    NOT NULL CHECK (content_type IN ('post', 'message', 'channel', 'user')),
  content_id    UUID    NOT NULL,
  reason        TEXT    NOT NULL,
  resolved      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Notifications ─────────────────────────────────────────────────────────
CREATE TABLE public.notifications (
  id          UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID              NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       TEXT              NOT NULL,
  message     TEXT              NOT NULL,
  data        JSONB,             -- extra payload for deep-linking
  is_read     BOOLEAN           NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);
