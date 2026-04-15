# PitchStock 🏏⚽

> Free-to-play cricket & football player stock market. Earn Play Coins, trade player stocks, climb leaderboards, win Trophy Coins for real cricket merchandise.

---

## Week 1 Deliverables — COMPLETE ✅

| # | Item | Status |
|---|------|--------|
| 1 | Folder structure (frontend + backend + database) | ✅ |
| 2 | Supabase schema — all 20 tables | ✅ |
| 3 | Row Level Security on all tables | ✅ |
| 4 | DB functions (credit/deduct coins atomically, portfolio growth, leaderboard refresh) | ✅ |
| 5 | Realtime enabled on key tables | ✅ |
| 6 | Backend: Express server + middleware (auth, validate, errors, rate-limit) | ✅ |
| 7 | Backend: Auth routes + registration with signup bonus | ✅ |
| 8 | Backend: Players routes (list, search, detail, price history) | ✅ |
| 9 | Backend: Coins routes (daily login, ad reward, coin history) | ✅ |
| 10 | Backend: Stock buy/sell with atomic coin deduction | ✅ |
| 11 | Stock price engine (cricket + football scoring algorithm) | ✅ |
| 12 | Cricket API + Football API service wrappers | ✅ |
| 13 | Match poller cron jobs (5 min poll, 30 min price update, daily tasks) | ✅ |
| 14 | Season service (end season, rank, award trophy coins, notify) | ✅ |
| 15 | Firebase push notification service | ✅ |
| 16 | Frontend: React Native scaffold (navigation, stores, services) | ✅ |
| 17 | Frontend: Design system (colors, typography, spacing) | ✅ |
| 18 | Frontend: Auth, Player, Portfolio Zustand stores | ✅ |
| 19 | Frontend: Reusable components (Button, PlayerCard, CoinBadge, TabBarIcon) | ✅ |
| 20 | All screen placeholders (17 screens, navigation working) | ✅ |
| 21 | Merchandise + seasons seed data | ✅ |

---

## Project Structure

```
pitchstock/
├── frontend/src/
│   ├── screens/          auth/ stocks/ portfolio/ leaderboard/ community/ store/ profile/
│   ├── components/       Button, PlayerCard, CoinBadge, TabBarIcon
│   ├── navigation/       RootNavigator, AuthNavigator, MainNavigator
│   ├── store/            authStore, playerStore, portfolioStore
│   ├── services/         supabase.js, api.js
│   └── constants/        colors.js, config.js
│
├── backend/src/
│   ├── routes/           health, auth, players, coins, stocks
│   ├── controllers/      authController, stocksController, coinsController
│   ├── middleware/        auth, validate, errorHandler
│   ├── services/         cricketApiService, footballApiService, stockPriceEngine
│   │                     seasonService, firebaseService
│   ├── jobs/             matchPoller (cron scheduler)
│   └── config/           env.js, supabase.js
│
└── database/
    ├── migrations/        001–008 (run in order in Supabase SQL Editor)
    └── seeds/             merchandise, seasons
```

---

## Setup

### 1. Clone and install

```bash
git clone <repo>
cd pitchstock

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
# Fill in all values — Supabase, Cricket API, Football API, Firebase, R2
```

### 3. Run Supabase migrations

Open [Supabase SQL Editor](https://app.supabase.com) and run each file in `/database/migrations/` in order:
```
001_extensions_and_enums.sql
002_users_and_players.sql
003_coins_transactions_portfolio.sql
004_matches_stats_price_history.sql
005_leaderboard_referrals_store.sql
006_community_and_notifications.sql
007_row_level_security.sql
008_realtime_and_functions.sql
```

Then run the seeds:
```
seeds/001_merchandise.sql
seeds/002_seasons.sql
```

### 4. Update frontend config

Edit `frontend/src/constants/config.js`:
```js
supabase: {
  url: 'YOUR_SUPABASE_URL',
  anonKey: 'YOUR_SUPABASE_ANON_KEY',
},
```

### 5. Run

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run android   # or npm run ios
```

---

## Coin Economy

| Action | Coins |
|--------|-------|
| Signup bonus | 🪙 1,000 Play Coins |
| Daily login | 🪙 75 (+ 100 every 7-day streak) |
| Watch rewarded ad | 🪙 50 |
| Refer a friend (when they watch 5 ads) | 🪙 500 |
| Friend welcome bonus | 🪙 250 |
| Season start | 🪙 1,000 |

| Season Rank | Trophy Coins |
|-------------|-------------|
| 1st (city/state/national) | 🏆 30,000 |
| 2nd | 🏆 15,000 |
| 3rd | 🏆 5,000 |

---

## Stock Price Algorithm

Prices update after each completed match using a sport-specific performance scoring system:

**Cricket weights:** runs, wickets, fifties, hundreds, catches, economy rate, strike rate, duck, no-balls, wides

**Football weights:** goals, assists, clean sheet, saves, tackles, pass accuracy, yellow/red cards, own goals, minutes played

```
performance_factor = Σ(stat_value / stat_max * weight)   clamped to [-1, +1]
delta = performance_factor * volatility_multiplier        clamped to [-25%, +25%]
new_price = old_price * (1 + delta)                       floored at 10, capped at 50,000
```

Volatility is higher for cheaper players, creating more excitement at lower price points.

---

## API Endpoints (Week 1)

```
GET  /api/health
POST /api/auth              — create profile after signup
GET  /api/auth/me           — get own profile
PATCH /api/auth/me          — update name/avatar/fcm_token

GET  /api/players           — list players (filter: sport, team, search)
GET  /api/players/:id       — player detail + price history + recent stats

POST /api/coins/daily-login — claim daily reward
POST /api/coins/ad-reward   — claim ad watch reward
GET  /api/coins/history     — paginated coin history

POST /api/stocks/buy        — buy shares { player_id, shares }
POST /api/stocks/sell       — sell shares { player_id, shares }
```

---

## Week 2 Plan

- [ ] Portfolio screen (holdings, total value, % growth chart)
- [ ] Leaderboard (city / state / national tabs)
- [ ] Season detail screen
- [ ] Player detail screen with price chart (Victory Native)
- [ ] Buy/Sell screens with confirmation modal
- [ ] Referral system (share code, track status)

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Mobile | React Native + Expo |
| State | Zustand |
| Backend | Node.js + Express |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Realtime | Supabase Realtime |
| Notifications | Firebase FCM |
| Ads | Google AdMob |
| Cricket data | api-cricket.com |
| Football data | football-data.org |
| Storage | Cloudflare R2 |
| Hosting | Railway.app |

---

## Legal

PitchStock operates as a free-to-play game under India PROGA 2025:
- No real money involved at any point
- No coin transfer between users
- No personal direct messaging
- Trophy Coins earned only through competitive merit (season rankings)
- Merchandise redeemed through trophy coins = skill-based prize, not gambling
