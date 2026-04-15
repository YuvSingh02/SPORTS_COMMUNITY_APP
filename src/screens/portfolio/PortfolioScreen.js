// frontend/src/screens/portfolio/PortfolioScreen.js
//
// Displays the user's current holdings, total portfolio value,
// and profit/loss per player in the active season.
// Data: usePortfolioStore → GET /api/portfolio

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';

import usePortfolioStore from '../../store/portfolioStore';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = {
  background: '#0A0E17',
  surface: '#131929',
  border: '#1E2D40',
  green: '#00C853',
  greenDim: '#00C85320',
  gold: '#F4A916',
  red: '#FF5252',
  white: '#FFFFFF',
  muted: '#546E7A',
  highlight: '#1A2744',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Top summary card — total value, invested and overall growth.
 */
const SummaryCard = ({ totalValue, totalInvested, growthPercent }) => {
  const isProfit = growthPercent >= 0;

  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>Portfolio value</Text>
      <Text style={styles.summaryValue}>🪙 {totalValue.toLocaleString()}</Text>

      <View style={styles.summaryRow}>
        <View style={styles.summaryMeta}>
          <Text style={styles.metaLabel}>Invested</Text>
          <Text style={styles.metaValue}>🪙 {totalInvested.toLocaleString()}</Text>
        </View>
        <View style={[styles.growthBadge, isProfit ? styles.growthBadgeGreen : styles.growthBadgeRed]}>
          <Text style={[styles.growthText, isProfit ? styles.greenText : styles.redText]}>
            {isProfit ? '▲' : '▼'} {Math.abs(growthPercent)}%
          </Text>
        </View>
      </View>
    </View>
  );
};

/**
 * Single holding row — player name, shares, current value, profit/loss.
 * Tapping navigates to SellStockScreen.
 */
const HoldingCard = ({ holding, onPress }) => {
  const isProfit = holding.profit_or_loss >= 0;

  return (
    <TouchableOpacity style={styles.holdingCard} onPress={onPress} activeOpacity={0.8}>
      {/* Left — player info */}
      <View style={{ flex: 1 }}>
        <Text style={styles.holdingName}>{holding.player_name}</Text>
        <Text style={styles.holdingCountry}>{holding.country}</Text>
        <Text style={styles.holdingShares}>
          {holding.shares_owned} share{holding.shares_owned !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Right — value and P&L */}
      <View style={styles.holdingRight}>
        <Text style={styles.holdingValue}>🪙 {holding.current_value.toLocaleString()}</Text>
        <Text style={[styles.holdingPnL, isProfit ? styles.greenText : styles.redText]}>
          {isProfit ? '+' : ''}🪙 {holding.profit_or_loss.toLocaleString()}
        </Text>
        <Text style={styles.holdingPrice}>@ 🪙 {holding.current_price?.toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );
};

/**
 * Shown when the portfolio is empty.
 */
const EmptyState = ({ onExplore }) => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyTitle}>No holdings yet</Text>
    <Text style={styles.emptySubtitle}>
      Buy shares of cricket players to build your portfolio.
    </Text>
    <TouchableOpacity style={styles.exploreBtn} onPress={onExplore}>
      <Text style={styles.exploreBtnText}>Explore Players</Text>
    </TouchableOpacity>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const PortfolioScreen = ({ navigation }) => {
  const {
    holdings,
    totalValue,
    totalInvested,
    growthPercent,
    isLoading,
    fetchPortfolio,
  } = usePortfolioStore();

  // ── Load on mount ────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchPortfolio();
  }, []);

  // ── Pull-to-refresh ──────────────────────────────────────────────────────────

  const handleRefresh = useCallback(() => {
    fetchPortfolio();
  }, []);

  // ── Tap holding → go to SellStockScreen ──────────────────────────────────────

  const handleHoldingPress = (holding) => {
    navigation.navigate('SellStock', {
      player: {
        id: holding.player_id,
        name: holding.player_name,
        country: holding.country,
        current_price: holding.current_price,
      },
    });
  };

  // ── Loading state ────────────────────────────────────────────────────────────

  if (isLoading && holdings.length === 0) {
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

      <FlatList
        data={holdings}
        keyExtractor={(item) => item.player_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={COLORS.green}
          />
        }
        ListHeaderComponent={
          <View>
            <Text style={styles.screenTitle}>My Portfolio</Text>

            {holdings.length > 0 && (
              <SummaryCard
                totalValue={totalValue}
                totalInvested={totalInvested ?? 0}
                growthPercent={growthPercent}
              />
            )}

            {holdings.length > 0 && (
              <Text style={styles.sectionLabel}>Holdings</Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <HoldingCard
            holding={item}
            onPress={() => handleHoldingPress(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            onExplore={() => navigation.navigate('Stocks', { screen: 'PlayerList' })}
          />
        }
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },

  // Screen title
  screenTitle: { fontSize: 22, fontWeight: '700', color: COLORS.white, marginTop: 16, marginBottom: 16 },

  // Summary card
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    marginBottom: 24,
  },
  summaryLabel: { fontSize: 13, color: COLORS.muted, marginBottom: 6 },
  summaryValue: { fontSize: 32, fontWeight: '700', color: COLORS.white, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryMeta: {},
  metaLabel: { fontSize: 12, color: COLORS.muted },
  metaValue: { fontSize: 14, fontWeight: '600', color: COLORS.white, marginTop: 2 },

  // Growth badge
  growthBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  growthBadgeGreen: { backgroundColor: COLORS.greenDim },
  growthBadgeRed: { backgroundColor: '#FF525220' },
  growthText: { fontSize: 14, fontWeight: '700' },
  greenText: { color: COLORS.green },
  redText: { color: COLORS.red },

  // Section label
  sectionLabel: { fontSize: 13, color: COLORS.muted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },

  // Holding card
  holdingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  holdingName: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  holdingCountry: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  holdingShares: { fontSize: 12, color: COLORS.muted, marginTop: 6 },
  holdingRight: { alignItems: 'flex-end' },
  holdingValue: { fontSize: 15, fontWeight: '700', color: COLORS.gold },
  holdingPnL: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  holdingPrice: { fontSize: 11, color: COLORS.muted, marginTop: 4 },

  // Empty state
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: COLORS.muted, textAlign: 'center', marginBottom: 32, paddingHorizontal: 32 },
  exploreBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  exploreBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.background },
});

export default PortfolioScreen;