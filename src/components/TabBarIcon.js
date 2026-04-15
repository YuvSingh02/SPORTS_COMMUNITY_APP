// components/TabBarIcon.js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

// Inline SVG icons to avoid icon library dependencies
const icons = {
  Stocks: (color) => (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M3 17l4-4 4 4 4-6 4-4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  ),
  Portfolio: (color) => (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z" stroke={color} strokeWidth={2} strokeLinecap="round"/>
    </Svg>
  ),
  Leaderboard: (color) => (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M8 21V10M12 21V3M16 21V14" stroke={color} strokeWidth={2} strokeLinecap="round"/>
    </Svg>
  ),
  Community: (color) => (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={color} strokeWidth={2} strokeLinecap="round"/>
    </Svg>
  ),
  Profile: (color) => (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={2}/>
      <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth={2} strokeLinecap="round"/>
    </Svg>
  ),
};

const TabBarIcon = ({ name, color }) => {
  const renderIcon = icons[name];
  if (!renderIcon) return null;

  return <View style={styles.container}>{renderIcon(color)}</View>;
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
});

export default TabBarIcon;
