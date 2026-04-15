// navigation/MainNavigator.js
// Clean, modern tab bar — social-first design
// No game-style icons or heavy styling

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Colors, Typography } from '../constants/colors';

// ── Tab screens ───────────────────────────────────────────────────────────────
import HomeScreen from '../screens/stocks/HomeScreen';
import PortfolioScreen from '../screens/portfolio/PortfolioScreen';
import LeaderboardScreen from '../screens/leaderboard/LeaderboardScreen';
import CommunityScreen from '../screens/community/CommunityScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

// ── Stack screens ─────────────────────────────────────────────────────────────
import PlayerListScreen from '../screens/stocks/PlayerListScreen';
import PlayerDetailScreen from '../screens/stocks/PlayerDetailScreen';
import BuyStockScreen from '../screens/stocks/BuyStockScreen';
import SellStockScreen from '../screens/stocks/SellStockScreen';
import StoreScreen from '../screens/store/StoreScreen';
import ChannelScreen from '../screens/community/ChannelScreen';
import NotificationsScreen from '../screens/profile/NotificationsScreen';
import CoinHistoryScreen from '../screens/profile/CoinHistoryScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── Tab icon map ──────────────────────────────────────────────────────────────
// Clean unicode / emoji icons — no game-style imagery
const TAB_ICONS = {
  Stocks: { active: '📈', inactive: '📈', label: 'Markets' },
  Portfolio: { active: '💼', inactive: '💼', label: 'Portfolio' },
  Leaderboard: { active: '🏆', inactive: '🏆', label: 'Leagues' },
  Community: { active: '💬', inactive: '💬', label: 'Community' },
  Profile: { active: '👤', inactive: '👤', label: 'Profile' },
};

const TabIcon = ({ routeName, focused }) => {
  const icon = TAB_ICONS[routeName];
  return (
    <View style={[tabStyles.iconWrap, focused && tabStyles.iconWrapActive]}>
      <Text style={tabStyles.iconEmoji}>{focused ? icon.active : icon.inactive}</Text>
      {focused && <View style={tabStyles.activeDot} />}
    </View>
  );
};

const tabStyles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  iconWrapActive: {
    // no glow — just the dot indicator below
  },
  iconEmoji: {
    fontSize: 20,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginTop: 3,
  },
});

// ── Stacks ────────────────────────────────────────────────────────────────────

const StocksStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="StocksHome" component={HomeScreen} />
    <Stack.Screen name="PlayerList" component={PlayerListScreen} />
    <Stack.Screen name="PlayerProfile" component={PlayerDetailScreen} />
    <Stack.Screen name="PlayerDetail" component={PlayerDetailScreen} />
    <Stack.Screen name="BuyStock" component={BuyStockScreen} />
    <Stack.Screen name="SellStock" component={SellStockScreen} />
  </Stack.Navigator>
);

const PortfolioStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="PortfolioHome" component={PortfolioScreen} />
    <Stack.Screen name="SellStock" component={SellStockScreen} />
    <Stack.Screen name="CoinHistory" component={CoinHistoryScreen} />
    <Stack.Screen name="Store" component={StoreScreen} />
  </Stack.Navigator>
);

const CommunityStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="CommunityHome" component={CommunityScreen} />
    <Stack.Screen name="Channel" component={ChannelScreen} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProfileHome" component={ProfileScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
  </Stack.Navigator>
);

// ── Main navigator ────────────────────────────────────────────────────────────

const MainNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: {
        backgroundColor: Colors.bgElevated,
        borderTopColor: Colors.border,
        borderTopWidth: 1,
        height: Platform.OS === 'ios' ? 82 : 62,
        paddingBottom: Platform.OS === 'ios' ? 22 : 8,
        paddingTop: 6,
      },
      tabBarActiveTintColor: Colors.primary,
      tabBarInactiveTintColor: Colors.textMuted,
      tabBarLabelStyle: {
        fontSize: Typography.fontSizes.xs,
        fontWeight: Typography.fontWeights.medium,
        marginTop: 0,
      },
      tabBarIcon: ({ focused }) => (
        <TabIcon routeName={route.name} focused={focused} />
      ),
    })}
  >
    <Tab.Screen name="Stocks" component={StocksStack} options={{ title: 'Markets' }} />
    <Tab.Screen name="Portfolio" component={PortfolioStack} options={{ title: 'Portfolio' }} />
    <Tab.Screen name="Leaderboard" component={LeaderboardScreen} options={{ title: 'Leagues' }} />
    <Tab.Screen name="Community" component={CommunityStack} options={{ title: 'Community' }} />
    <Tab.Screen name="Profile" component={ProfileStack} options={{ title: 'Profile' }} />
  </Tab.Navigator>
);

export default MainNavigator;