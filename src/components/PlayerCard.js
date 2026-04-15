// components/PlayerCard.js
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/colors';

const PriceChange = ({ current, prev }) => {
  if (!prev || prev === 0) return null;
  const pct     = ((current - prev) / prev) * 100;
  const isUp    = pct >= 0;
  const color   = isUp ? Colors.profit : Colors.loss;
  const arrow   = isUp ? '▲' : '▼';

  return (
    <Text style={[styles.priceChange, { color }]}>
      {arrow} {Math.abs(pct).toFixed(1)}%
    </Text>
  );
};

const PlayerCard = ({ player, onPress }) => {
  const { name, team, sport, current_price, prev_price, form_score, image_url } = player;

  const formColor =
    form_score >= 70 ? Colors.profit :
    form_score >= 40 ? Colors.warning :
    Colors.loss;

  return (
    <TouchableOpacity onPress={() => onPress(player)} activeOpacity={0.85} style={styles.card}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {image_url ? (
          <Image source={{ uri: image_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{name[0]}</Text>
          </View>
        )}
        <View style={[styles.sportBadge, { backgroundColor: sport === 'cricket' ? '#1B5E20' : '#1A237E' }]}>
          <Text style={styles.sportEmoji}>{sport === 'cricket' ? '🏏' : '⚽'}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <Text style={styles.team} numberOfLines={1}>{team}</Text>
      </View>

      {/* Form score */}
      <View style={styles.formContainer}>
        <Text style={styles.formLabel}>Form</Text>
        <Text style={[styles.formScore, { color: formColor }]}>{form_score.toFixed(0)}</Text>
      </View>

      {/* Price */}
      <View style={styles.priceContainer}>
        <Text style={styles.price}>🪙 {current_price.toLocaleString()}</Text>
        <PriceChange current={current_price} prev={prev_price} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.surface,
    borderRadius:    Radius.md,
    padding:         Spacing.md,
    marginBottom:    Spacing.sm,
    borderWidth:     1,
    borderColor:     Colors.border,
    ...Shadow.sm,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: Radius.full,
  },
  avatarFallback: {
    backgroundColor: Colors.surfaceAlt,
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarInitial: {
    color:      Colors.textPrimary,
    fontSize:   Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.bold,
  },
  sportBadge: {
    position:     'absolute',
    bottom:       -2,
    right:        -2,
    width:        18,
    height:       18,
    borderRadius: Radius.full,
    alignItems:   'center',
    justifyContent: 'center',
  },
  sportEmoji: {
    fontSize: 9,
  },
  info: {
    flex: 1,
  },
  name: {
    color:      Colors.textPrimary,
    fontSize:   Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
  },
  team: {
    color:    Colors.textSecondary,
    fontSize: Typography.fontSizes.sm,
    marginTop: 2,
  },
  formContainer: {
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  formLabel: {
    color:    Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
  },
  formScore: {
    fontSize:   Typography.fontSizes.md,
    fontWeight: Typography.fontWeights.bold,
  },
  priceContainer: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  price: {
    color:      Colors.textPrimary,
    fontSize:   Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
  },
  priceChange: {
    fontSize: Typography.fontSizes.xs,
    marginTop: 2,
  },
});

export default PlayerCard;
