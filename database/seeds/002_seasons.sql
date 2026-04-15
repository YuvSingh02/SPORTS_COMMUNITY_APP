-- Seed: initial seasons
-- Adjust dates before running in production

INSERT INTO public.seasons (name, type, start_date, end_date, status)
VALUES
  (
    'Week 1 — Launch Season',
    'weekly',
    NOW(),
    NOW() + INTERVAL '7 days',
    'active'
  ),
  (
    'Month 1 — June Season',
    'monthly',
    DATE_TRUNC('month', NOW()),
    DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 second',
    'active'
  );
