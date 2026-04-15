// screens/store/StoreScreen.js

import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  StatusBar, TouchableOpacity,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../constants/colors';

const PREVIEW_ITEMS = [
  { icon: '⚡', title: 'Boosts', desc: 'Amplify your stock gains for 24h' },
  { icon: '🛡️', title: 'Shield', desc: 'Protect against one bad match' },
  { icon: '🎯', title: 'Insider Tips', desc: 'Early access to player insights' },
  { icon: '👑', title: 'Pro Badge', desc: 'Stand out on the leaderboard' },
];

const StoreScreen = () => (
  <SafeAreaView style={s.safe}>
    <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

    <View style={s.screen}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Store</Text>
        <Text style={s.headerSub}>Power-ups & perks</Text>
      </View>

      {/* Coming soon hero */}
      <View style={s.hero}>
        <Text style={s.heroIcon}>🏪</Text>
        <Text style={s.heroTitle}>Coming Soon</Text>
        <Text style={s.heroDesc}>
          The store is under construction.{'\n'}
          Get ready to power up your game.
        </Text>
      </View>

      {/* Preview items */}
      <Text style={s.previewLabel}>What's coming</Text>
      <View style={s.previewList}>
        {PREVIEW_ITEMS.map((item) => (
          <View key={item.title} style={s.previewCard}>
            <View style={s.previewIconWrap}>
              <Text style={s.previewIcon}>{item.icon}</Text>
            </View>
            <View style={s.previewText}>
              <Text style={s.previewTitle}>{item.title}</Text>
              <Text style={s.previewDesc}>{item.desc}</Text>
            </View>
            <View style={s.lockedChip}>
              <Text style={s.lockedChipText}>Soon</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Notify CTA */}
      <TouchableOpacity style={s.notifyBtn} activeOpacity={0.8}>
        <Text style={s.notifyBtnText}>Notify me when it's live</Text>
      </TouchableOpacity>
    </View>
  </SafeAreaView>
);

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  screen: { flex: 1, paddingHorizontal: Spacing.base },

  header: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.xxl,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: -0.5,
  },
  headerSub: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.sm,
    marginTop: 3,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heroIcon: { fontSize: 52, marginBottom: Spacing.md },
  heroTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.bold,
    marginBottom: Spacing.sm,
  },
  heroDesc: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.base,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.xl,
  },

  // Preview list
  previewLabel: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  previewList: { gap: Spacing.sm, marginBottom: Spacing.xl },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  previewIconWrap: {
    width: 42, height: 42,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bgSunken,
    alignItems: 'center', justifyContent: 'center',
  },
  previewIcon: { fontSize: 20 },
  previewText: { flex: 1 },
  previewTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
  },
  previewDesc: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.sm,
    marginTop: 2,
  },
  lockedChip: {
    backgroundColor: Colors.accentDim,
    borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  lockedChipText: {
    color: Colors.accent,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
  },

  // Notify button
  notifyBtn: {
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  notifyBtnText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
  },
});

export default StoreScreen;