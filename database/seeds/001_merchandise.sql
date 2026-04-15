-- Seed: merchandise catalog
-- Run after migrations

INSERT INTO public.merchandise (name, description, category, play_coin_price, trophy_coin_price, stock_qty)
VALUES
  -- Basic tier (Play Coins only)
  (
    'PitchStock Voucher',
    'Digital voucher redeemable on partner sports apps',
    'voucher',
    5000,
    NULL,
    999
  ),
  (
    'Leather Cricket Ball',
    'Official weight leather cricket ball — great for practice',
    'equipment',
    10000,
    NULL,
    500
  ),
  (
    'PitchStock Fan Jersey',
    'Polyester fan jersey with PitchStock branding',
    'apparel',
    25000,
    NULL,
    200
  ),

  -- Premium tier (Trophy Coins only)
  (
    'Player Signed Bat',
    'Full-size cricket bat signed by a current IPL player (random selection)',
    'collectible',
    NULL,
    60000,
    50
  ),
  (
    'IPL Match Tickets',
    'Two tickets to a home IPL league game (city based on winner location)',
    'tickets',
    NULL,
    80000,
    30
  );
