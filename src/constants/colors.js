// constants/colors.js
// Design system — modern social-first dark theme
// Inspired by the best of Telegram, Reddit, X, Instagram — but sharper

export const Colors = {
  // ── Brand ──────────────────────────────────────────────────────────────────
  primary: '#1DB954',   // Spotify-inspired green — confident, not neon
  primaryDim: '#1DB95418',
  primaryMuted: '#1DB95440',

  // ── Accent ─────────────────────────────────────────────────────────────────
  accent: '#F0B429',   // warm amber — trophies, highlights
  accentDim: '#F0B42918',

  // ── Backgrounds ────────────────────────────────────────────────────────────
  // Layered depth like Telegram dark — NOT pure black
  bg: '#0D1117',   // root background  (GitHub dark-inspired)
  bgElevated: '#161B22',   // cards, sheets
  bgSunken: '#090D13',   // inputs, pressed states
  bgOverlay: '#000000CC', // modal scrims

  // ── Surfaces ───────────────────────────────────────────────────────────────
  surface: '#161B22',
  surfaceHover: '#1C2128',
  surfaceActive: '#21262D',

  // ── Borders ────────────────────────────────────────────────────────────────
  border: '#21262D',   // subtle — barely visible
  borderStrong: '#30363D',   // dividers

  // ── Text ───────────────────────────────────────────────────────────────────
  textPrimary: '#E6EDF3',   // NOT pure white — easier on eyes (GitHub)
  textSecondary: '#8B949E',   // secondary labels
  textMuted: '#484F58',   // timestamps, placeholders
  textInverse: '#0D1117',   // text on bright buttons
  textLink: '#58A6FF',   // links, mentions

  // ── Semantic ───────────────────────────────────────────────────────────────
  profit: '#3FB950',   // stock up
  loss: '#F85149',   // stock down
  neutral: '#8B949E',

  // ── Coins ──────────────────────────────────────────────────────────────────
  playCoin: '#58A6FF',
  trophyCoin: '#F0B429',

  // ── Status ─────────────────────────────────────────────────────────────────
  success: '#3FB950',
  warning: '#D29922',
  error: '#F85149',
  info: '#58A6FF',

  // ── Legacy aliases (keep backward compat) ──────────────────────────────────
  background: '#0D1117',
  surfaceAlt: '#1C2128',
  textPrimary_: '#E6EDF3',
  textSecondary_: '#8B949E',
  textMuted_: '#484F58',
  borderLight: '#30363D',
  playCoinColor: '#58A6FF',
  trophyCoinColor: '#F0B429',
};

export const Typography = {
  fontSizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 30,
    hero: 38,
  },
  fontWeights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    black: '900',
  },
  lineHeights: {
    tight: 1.25,
    normal: 1.55,   // increased for readability
    relaxed: 1.8,
  },
  letterSpacing: {
    tight: -0.3,
    normal: 0,
    wide: 0.5,
    wider: 1.2,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// Minimal shadows — social apps don't use heavy shadows
export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
};