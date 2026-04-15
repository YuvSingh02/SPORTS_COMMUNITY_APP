// components/CoinBadge.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../constants/colors';

const formatCoins = (amount) => {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000)     return `${(amount / 1_000).toFixed(1)}K`;
  return amount.toString();
};

const CoinBadge = ({
  amount,
  type    = 'play',    // 'play' | 'trophy'
  size    = 'md',      // 'sm' | 'md' | 'lg'
  showLabel = false,
}) => {
  const isPlay   = type === 'play';
  const color    = isPlay ? Colors.playCoin : Colors.trophyCoin;
  const emoji    = isPlay ? '🪙' : '🏆';
  const label    = isPlay ? 'Play Coins' : 'Trophy Coins';

  const textSize = { sm: Typography.fontSizes.xs, md: Typography.fontSizes.sm, lg: Typography.fontSizes.base }[size];
  const padding  = { sm: Spacing.xs, md: Spacing.sm, lg: Spacing.md }[size];

  return (
    <View style={[styles.badge, { borderColor: color, paddingHorizontal: padding, paddingVertical: padding / 2 }]}>
      <Text style={[styles.emoji, { fontSize: textSize }]}>{emoji}</Text>
      <Text style={[styles.amount, { color, fontSize: textSize }]}>
        {formatCoins(amount)}
      </Text>
      {showLabel && (
        <Text style={[styles.label, { fontSize: textSize - 1 }]}>{label}</Text>
      )}
    </View>
  );
};

export const CoinAmount = ({ amount, type = 'play', size = 'md' }) => {
  const isPlay = type === 'play';
  const color  = isPlay ? Colors.playCoin : Colors.trophyCoin;
  const emoji  = isPlay ? '🪙' : '🏆';
  const textSize = { sm: 11, md: 13, lg: 15 }[size];

  return (
    <Text style={{ color, fontSize: textSize, fontWeight: Typography.fontWeights.semibold }}>
      {emoji} {formatCoins(amount)}
    </Text>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            4,
    borderWidth:    1,
    borderRadius:   Radius.full,
    backgroundColor: Colors.surface,
  },
  emoji: {
    lineHeight: 18,
  },
  amount: {
    fontWeight: Typography.fontWeights.bold,
  },
  label: {
    color:  Colors.textSecondary,
    marginLeft: 2,
  },
});

export default CoinBadge;
