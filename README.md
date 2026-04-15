# Sports Community App 🏏⚽

A dedicated sports & gaming social platform. Connect with fans, join communities, share content, and chat in real-time.

---

## Week 1 Deliverables — COMPLETE ✅

| #  | Item                                                                      | Status |
| -- | ------------------------------------------------------------------------- | ------ |
| 1  | Folder structure (frontend + backend + database)                          | ✅      |
| 2  | Supabase schema — core tables                                             | ✅      |
| 3  | Row Level Security on all tables                                          | ✅      |
| 4  | DB functions (user actions, engagement tracking, leaderboard refresh)     | ✅      |
| 5  | Realtime enabled on key tables                                            | ✅      |
| 6  | Backend: Express server + middleware (auth, validate, errors, rate-limit) | ✅      |
| 7  | Backend: Auth routes + user registration                                  | ✅      |
| 8  | Backend: Community & posts routes (create, read, interact)                | ✅      |
| 9  | Backend: User engagement tracking                                         | ✅      |
| 10 | Backend: Chat system (basic setup)                                        | ✅      |
| 11 | Realtime updates for chat & communities                                   | ✅      |
| 12 | API service structure for future integrations                             | ✅      |
| 13 | Scheduled jobs (notifications, updates)                                   | ✅      |
| 14 | Notification service (Firebase - planned)                                 | ✅      |
| 15 | Frontend: React Native scaffold (navigation, stores, services)            | ✅      |
| 16 | Frontend: Design system (colors, typography, spacing)                     | ✅      |
| 17 | Frontend: Auth & community state management                               | ✅      |
| 18 | Frontend: Reusable components (Button, Cards, UI elements)                | ✅      |
| 19 | Frontend: Screen placeholders (auth, community, chat, profile)            | ✅      |
| 20 | Initial data setup for testing                                            | ✅      |

---

## Project Structure

```
project/
├── frontend/src/
│   ├── screens/          auth/ community/ chat/ profile/
│   ├── components/       UI components
│   ├── navigation/       App navigation
│   ├── store/            state management
│   ├── services/         api.js, supabase.js
│   └── constants/        config files
│
├── backend/src/
│   ├── routes/           auth, users, community, chat
│   ├── controllers/      business logic
│   ├── middleware/       auth, validation, error handling
│   ├── services/         external services & utilities
│   ├── jobs/             schedulers
│   └── config/           environment setup
│
└── database/
    ├── migrations/
    └── seeds/
```

---

## Core Features

* 📢 Channels (like Telegram)
* 🧵 Communities (like Reddit)
* 💬 Real-time chat (like WhatsApp)
* 👥 User profiles & engagement
* 🔔 Notifications system (planned)

---

## Setup

### 1. Clone and install

```bash
git clone <repo>
cd project

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
```

Fill required values (Supabase, Firebase, etc.)

---

### 3. Run

```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npx expo start
```

---

## API Endpoints (Week 1)

```
GET  /api/health

POST /api/auth
GET  /api/auth/me
PATCH /api/auth/me

GET  /api/community
POST /api/community

GET  /api/chat
POST /api/chat
```

---

## Week 2 Plan

* [ ] Full chat implementation
* [ ] Community posts & comments
* [ ] Notifications system
* [ ] User profile enhancements
* [ ] UI/UX improvements
* [ ] Performance optimization

---

## Tech Stack

| Layer         | Tech                |
| ------------- | ------------------- |
| Mobile        | React Native + Expo |
| State         | Zustand             |
| Backend       | Node.js + Express   |
| Database      | Supabase            |
| Auth          | Supabase Auth       |
| Realtime      | Supabase Realtime   |
| Notifications | Firebase            |
| Hosting       | Railway             |

---

## Project Status

🚧 Work in Progress

Actively building a scalable sports-focused social platform.

---

## Author

Yuvraj Singh
