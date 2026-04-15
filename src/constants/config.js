// constants/config.js
// All app-wide configuration in one place

export const AppConfig = {
  name: 'PitchStock',
  version: '1.0.0',
  bundleId: 'com.pitchstock.app',

  api: {
    baseUrl: __DEV__
      ? 'http://192.168.0.110:3000/api'
      : 'https://pitchstock-api.railway.app/api',
    timeout: 10000,
  },

  supabase: {
    url: 'https://agozacnrcbnacraxrdem.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnb3phY25yY2JuYWNyYXhyZGVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMTYwMTAsImV4cCI6MjA4OTY5MjAxMH0.egLJPlOv9RoqZy5hdRT8_ocV9496vLL3EOlcQGGfeLE',
  },

  admob: {
    bannerAdUnitId: __DEV__
      ? 'ca-app-pub-3940256099942544/6300978111'
      : 'YOUR_BANNER_AD_UNIT_ID',
    rewardedAdUnitId: __DEV__
      ? 'ca-app-pub-3940256099942544/5224354917'
      : 'YOUR_REWARDED_AD_UNIT_ID',
  },

  pagination: {
    defaultLimit: 20,
    leaderboardLimit: 50,
  },
};

export const CoinRules = {
  signupBonus: 1000,
  dailyLogin: 75,
  watchAd: 50,
  referrerBonus: 500,
  referredBonus: 250,
  referredAdsRequired: 5,
  seasonStartCoins: 1000,
};

export const TrophyCoinPrizes = {
  firstPlace: 30000,
  secondPlace: 15000,
  thirdPlace: 5000,
};

export const StoreItems = {
  basic: {
    voucher: 5000,
    ball: 10000,
    jersey: 25000,
  },
  premium: {
    signedBat: 60000,
    matchTickets: 80000,
  },
};

export const IndiaStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal',
];