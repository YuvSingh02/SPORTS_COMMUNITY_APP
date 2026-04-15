// frontend/src/screens/stocks/SellStockScreen.js
//
// Allows a user to sell shares of a cricket player they already own.
// Receives `player` object via navigation params from PlayerDetailScreen or PortfolioScreen.
// Backend: POST /api/stocks/sell  →  stocksService.sellShares

import React, { useState, useEffect, useMemo } from 'react';
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

import { sellShares, fetchHolding } from '../../services/stocksService';
import useAuthStore from '../../store/authStore';

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_SHARES = 1;

const COLORS = {
  background: '#0A0E17',
  surface: '#131929',
  border: '#1E2D40',
  green: '#00C853',
  greenDim: '#00C85320',
  gold: '#F4A916',
  goldDim: '#F4A91620',
  red: '#FF5252',
  redDim: '#FF525220',
  white: '#FFFFFF',
  muted: '#546E7A',
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
        <Text style={styles.priceLabel}>Current price</Text>
        <Text style={styles.priceValue}>🪙 {player.current_price?.toLocaleString()}</Text>
      </View>
    </View>
  </View>
);

/**
 * Shows shares owned and avg buy price fetched from backend.
 */
const HoldingInfoCard = ({ sharesOwned, avgBuyPrice }) => (
  <View style={styles.card}>
    <View style={styles.summaryRow}>
      <Text style={styles.summaryKey}>Shares owned</Text>
      <Text style={styles.summaryValue}>{sharesOwned}</Text>
    </View>
    <View style={styles.summaryRow}>
      <Text style={styles.summaryKey}>Avg buy price</Text>
      <Text style={styles.summaryValue}>🪙 {avgBuyPrice?.toLocaleString()}</Text>
    </View>
  </View>
);

/**
 * +/− stepper to pick sell quantity. Clamps to MIN_SHARES–sharesOwned.
 */
const ShareStepper = ({ shares, maxShares, onDecrement, onIncrement }) => (
  <View style={styles.card}>
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>Shares to sell</Text>
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
          style={[styles.stepBtn, shares >= maxShares && styles.stepBtnDisabled]}
          onPress={onIncrement}
          disabled={shares >= maxShares}
          accessibilityLabel="Increase shares"
        >
          <Text style={styles.stepBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

/**
 * Shows sale value and profit/loss preview.
 */
const SaleSummary = ({ shares, currentPrice, avgBuyPrice }) => {
  const saleValue = currentPrice * shares;
  const profitOrLoss = (currentPrice - avgBuyPrice) * shares;
  const isProfit = profitOrLoss >= 0;

  return (
    <View style={styles.card}>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryKey}>Sale value</Text>
        <Text style={[styles.summaryValue, styles.goldText]}>🪙 {saleValue.toLocaleString()}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryKey}>Profit / Loss</Text>
        <Text style={[styles.summaryValue, isProfit ? styles.greenText : styles.redText]}>
          {isProfit ? '+' : ''}🪙 {profitOrLoss.toLocaleString()}
        </Text>
      </View>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const SellStockScreen = ({ route, navigation }) => {
  const { player } = route.params;

  const patchProfile = useAuthStore((s) => s.patchProfile);

  const [shares, setShares] = useState(1);
  const [holding, setHolding] = useState(null);   // { shares_owned, avg_buy_price }
  const [isFetching, setIsFetching] = useState(true);   // loading holding from backend
  const [isLoading, setIsLoading] = useState(false);  // loading sell request

  // ── Fetch holding on mount ───────────────────────────────────────────────────

  useEffect(() => {
    const loadHolding = async () => {
      try {
        const res = await fetchHolding(player.id);
        if (res.success) {
          setHolding(res.data);
        } else {
          Alert.alert('No holding found', 'You do not own any shares of this player.', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        }
      } catch (err) {
        Alert.alert('Error', 'Could not load your holding. Please try again.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } finally {
        setIsFetching(false);
      }
    };

    loadHolding();
  }, [player.id]);

  // ── Derived values ───────────────────────────────────────────────────────────

  const maxShares = holding?.shares_owned ?? 1;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleDecrement = () =>
    setShares((prev) => Math.max(MIN_SHARES, prev - 1));

  const handleIncrement = () =>
    setShares((prev) => Math.min(maxShares, prev + 1));

  const handleConfirmSell = async () => {
    setIsLoading(true);
    try {
      const res = await sellShares(player.id, shares);

      if (res.success) {
        patchProfile({ play_coins: res.data.new_balance });

        Alert.alert(
          'Sale successful',
          `You sold ${res.data.shares_sold} share(s) of ${player.name} for 🪙 ${res.data.sale_value.toLocaleString()}.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Sale failed', res.message ?? 'Please try again.');
      }
    } catch (err) {
      Alert.alert('Error', 'Trade failed — please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Loading state (fetching holding) ────────────────────────────────────────

  if (isFetching) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ flex: 1 }} color={COLORS.green} />
      </SafeAreaView>
    );
  }

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
          <Text style={styles.headerTitle}>Sell Shares</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Player info */}
        <PlayerInfoCard player={player} />

        {/* Current holding */}
        <HoldingInfoCard
          sharesOwned={holding.shares_owned}
          avgBuyPrice={holding.avg_buy_price}
        />

        {/* Share quantity stepper */}
        <ShareStepper
          shares={shares}
          maxShares={maxShares}
          onDecrement={handleDecrement}
          onIncrement={handleIncrement}
        />

        {/* Sale summary */}
        <SaleSummary
          shares={shares}
          currentPrice={player.current_price}
          avgBuyPrice={holding.avg_buy_price}
        />

        {/* Confirm button */}
        <TouchableOpacity
          style={[styles.confirmBtn, isLoading && styles.confirmBtnDisabled]}
          onPress={handleConfirmSell}
          disabled={isLoading}
          accessibilityLabel="Confirm sale"
        >
          {isLoading
            ? <ActivityIndicator color={COLORS.background} />
            : <Text style={styles.confirmBtnText}>Confirm Sale</Text>
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

  // Summary rows
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryKey: { fontSize: 14, color: COLORS.muted },
  summaryValue: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  goldText: { color: COLORS.gold },
  greenText: { color: COLORS.green },
  redText: { color: COLORS.red },

  // Stepper
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepperLabel: { fontSize: 15, color: COLORS.white, fontWeight: '600' },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepperValue: { fontSize: 22, fontWeight: '700', color: COLORS.white, minWidth: 36, textAlign: 'center' },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.redDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.red,
  },
  stepBtnDisabled: { opacity: 0.3 },
  stepBtnText: { fontSize: 22, color: COLORS.red, fontWeight: '700', lineHeight: 26 },

  // Confirm button
  confirmBtn: {
    backgroundColor: COLORS.red,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
});

export default SellStockScreen;