#!/usr/bin/env node
// Generates placeholder screen files so navigation doesn't crash on launch

const fs   = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '../frontend/src/screens');

const screens = [
  // Auth
  ['auth/WelcomeScreen',       'WelcomeScreen'],
  ['auth/LoginScreen',         'LoginScreen'],
  ['auth/RegisterScreen',      'RegisterScreen'],
  ['auth/LocationSetupScreen', 'LocationSetupScreen'],

  // Stocks
  ['stocks/HomeScreen',        'HomeScreen'],
  ['stocks/PlayerDetailScreen','PlayerDetailScreen'],
  ['stocks/BuyStockScreen',    'BuyStockScreen'],
  ['stocks/SellStockScreen',   'SellStockScreen'],

  // Portfolio
  ['portfolio/PortfolioScreen','PortfolioScreen'],

  // Leaderboard
  ['leaderboard/LeaderboardScreen','LeaderboardScreen'],

  // Community
  ['community/CommunityScreen','CommunityScreen'],
  ['community/ChannelScreen',  'ChannelScreen'],

  // Store
  ['store/StoreScreen',        'StoreScreen'],

  // Profile
  ['profile/ProfileScreen',      'ProfileScreen'],
  ['profile/NotificationsScreen','NotificationsScreen'],
  ['profile/CoinHistoryScreen',  'CoinHistoryScreen'],

  // Root
  ['LoadingScreen',            'LoadingScreen'],
];

const template = (name) => `// screens/${name}.js — placeholder (implement in upcoming week)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ${name} = () => (
  <View style={styles.container}>
    <Text style={styles.text}>${name}</Text>
    <Text style={styles.sub}>Coming soon</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17', alignItems: 'center', justifyContent: 'center' },
  text:      { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  sub:       { color: '#546E7A', fontSize: 14, marginTop: 8 },
});

export default ${name};
`;

screens.forEach(([filePath, componentName]) => {
  const fullPath = path.join(BASE, filePath + '.js');
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, template(componentName));
    console.log(`  created: ${filePath}.js`);
  } else {
    console.log(`  exists:  ${filePath}.js (skipped)`);
  }
});

console.log('\nDone — all screens ready.');
