// frontend/src/screens/stocks/BuyStockScreen.js
//
// Allows a user to purchase shares of a cricket player.
// Receives `player` object via navigation params from PlayerDetailScreen.
// Backend: POST /api/stocks/buy  →  stocksService.buyShares

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';

import { buyShares } from '../../services/stocksService';
import useAuthStore from '../../store/authStore';

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_SHARES = 1;
const MAX_SHARES = 1000;

const COLORS = {
  background: '#0A0E17',
  surface: '#131929',
  border: '#1E2D40',
  green: '#00C853',
  greenDim: '#00C85320',
  gold: '#F4A916',
  goldDim: '#F4A91620',
  white: '#FFFFFF',
  muted: '#546E7A',
  danger: '#FF5252',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Displays player name, country and current price per share.
 */
const PlayerInfoCard = ({ player }) => (
  <View style={styles.card}>
    <View style={styles.cardRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.playerName}>{player.name}</Text>
        <Text style={styles.playerCountry}>{player.country}</Text>
      </View>
      <View style={styles.priceTag}>
        <Text style={styles.priceLabel}>Price / share</Text>
        <Text style={styles.priceValue}>🪙 {player.current_price}</Text>
      </View>
    </View>
  </View>
);

/**
 * +/− stepper to pick share quantity. Clamps to MIN_SHARES–MAX_SHARES.
 */
const ShareStepper = ({ shares, onDecrement, onIncrement }) => (
  <View style={styles.stepperRow}>
    <Text style={styles.stepperLabel}>Shares</Text>
    <View style={styles.stepperControls}>
      <TouchableOpacity
        style={[styles.stepBtn, shares <= MIN_SHARES && styles.stepBtnDisabled]}
        onPress={onDecrement}
        disabled={shares <= MIN_SHARES}
        accessibilityLabel="Decrease shares"
      >
        <Text style={styles.stepBtnText}>−</Text>
      </TouchableOpacity>

      <Text style={styles.stepperValue}>{shares}</Text>

      <TouchableOpacity
        style={[styles.stepBtn, shares >= MAX_SHARES && styles.stepBtnDisabled]}
        onPress={onIncrement}
        disabled={shares >= MAX_SHARES}
        accessibilityLabel="Increase shares"
      >
        <Text style={styles.stepBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  </View>
);

/**
 * Shows total cost and whether the user can afford it.
 */
const CostSummary = ({ totalCost, userBalance }) => {
  const canAfford = userBalance >= totalCost;

  return (
    <View style={styles.card}>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryKey}>Total cost</Text>
        <Text style={[styles.summaryValue, styles.goldText]}>🪙 {totalCost}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryKey}>Your balance</Text>
        <Text style={[styles.summaryValue, !canAfford && styles.dangerText]}>
          🪙 {userBalance}
        </Text>
      </View>
      {!canAfford && (
        <Text style={styles.insufficientWarning}>Insufficient Play Coins</Text>
      )}
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const BuyStockScreen = ({ route, navigation }) => {
  const { player } = route.params;

  const profile = useAuthStore((s) => s.profile);
  const patchProfile = useAuthStore((s) => s.patchProfile);
  const deductCoins = useAuthStore((s) => s.deductCoins);

  const [shares, setShares] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const totalCost = useMemo(() => player.current_price * shares, [player.current_price, shares]);
  const userBalance = profile?.play_coins ?? 0;
  const canAfford = userBalance >= totalCost;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleDecrement = () =>
    setShares((prev) => Math.max(MIN_SHARES, prev - 1));

  const handleIncrement = () =>
    setShares((prev) => Math.min(MAX_SHARES, prev + 1));

  const handleConfirmBuy = async () => {
    if (!canAfford) return;

    setIsLoading(true);
    try {
      const res = await buyShares(player.id, shares);

      if (res.success) {
        // Keep local state in sync — backend is source of truth for final balance
        patchProfile({ play_coins: res.data.new_balance });

        Alert.alert(
          'Purchase successful',
          `You bought ${res.data.shares_bought} share(s) of ${player.name} for 🪙 ${res.data.total_cost}.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Purchase failed', res.message ?? 'Please try again.');
      }
    } catch (err) {
      Alert.alert('Error', 'Trade failed — please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Go back">
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Buy Shares</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Player info */}
        <PlayerInfoCard player={player} />

        {/* Share quantity stepper */}
        <View style={styles.card}>
          <ShareStepper
            shares={shares}
            onDecrement={handleDecrement}
            onIncrement={handleIncrement}
          />
        </View>

        {/* Cost summary */}
        <CostSummary totalCost={totalCost} userBalance={userBalance} />

        {/* Confirm button */}
        <TouchableOpacity
          style={[
            styles.confirmBtn,
            (!canAfford || isLoading) && styles.confirmBtnDisabled,
          ]}
          onPress={handleConfirmBuy}
          disabled={!canAfford || isLoading}
          accessibilityLabel="Confirm purchase"
        >
          {isLoading
            ? <ActivityIndicator color={COLORS.background} />
            : <Text style={styles.confirmBtnText}>Confirm Purchase</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backArrow: { fontSize: 24, color: COLORS.white, width: 28 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white },

  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
  },

  // Player info card
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  playerName: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  playerCountry: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  priceTag: { alignItems: 'flex-end' },
  priceLabel: { fontSize: 12, color: COLORS.muted },
  priceValue: { fontSize: 16, fontWeight: '700', color: COLORS.gold, marginTop: 4 },

  // Stepper
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepperLabel: { fontSize: 15, color: COLORS.white, fontWeight: '600' },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepperValue: { fontSize: 22, fontWeight: '700', color: COLORS.white, minWidth: 36, textAlign: 'center' },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.greenDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.green,
  },
  stepBtnDisabled: { opacity: 0.3 },
  stepBtnText: { fontSize: 22, color: COLORS.green, fontWeight: '700', lineHeight: 26 },

  // Summary
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryKey: { fontSize: 14, color: COLORS.muted },
  summaryValue: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  goldText: { color: COLORS.gold },
  dangerText: { color: COLORS.danger },
  insufficientWarning: { fontSize: 12, color: COLORS.danger, marginTop: 4, textAlign: 'right' },

  // Confirm button
  confirmBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.background },
});

export default BuyStockScreen;