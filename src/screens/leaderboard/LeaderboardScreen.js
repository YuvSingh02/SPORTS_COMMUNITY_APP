// frontend/src/screens/leaderboard/LeaderboardScreen.js
//
// Displays the leaderboard in three scopes: National, State, City.
// Backend: GET /api/leaderboard?scope=national|state|city

import React, { useState, useEffect, useCallback } from 'react';
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

import { fetchLeaderboard } from '../../services/leaderboardService';
import useAuthStore from '../../store/authStore';

// ─── Constants ────────────────────────────────────────────────────────────────

const SCOPES = [
  { key: 'national', label: 'National' },
  { key: 'state', label: 'State' },
  { key: 'city', label: 'City' },
];

const COLORS = {
  background: '#0A0E17',
  surface: '#131929',
  border: '#1E2D40',
  green: '#00C853',
  greenDim: '#00C85320',
  gold: '#F4A916',
  goldDim: '#F4A91620',
  silver: '#90A4AE',
  bronze: '#CD7F32',
  white: '#FFFFFF',
  muted: '#546E7A',
  highlight: '#1A2744',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * National / State / City tab switcher.
 */
const ScopeTabs = ({ activeScope, onSelect }) => (
  <View style={styles.tabRow}>
    {SCOPES.map((s) => (
      <TouchableOpacity
        key={s.key}
        style={[styles.tab, activeScope === s.key && styles.tabActive]}
        onPress={() => onSelect(s.key)}
        activeOpacity={0.8}
      >
        <Text style={[styles.tabText, activeScope === s.key && styles.tabTextActive]}>
          {s.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

/**
 * Medal color for top 3 ranks.
 */
const rankColor = (rank) => {
  if (rank === 1) return COLORS.gold;
  if (rank === 2) return COLORS.silver;
  if (rank === 3) return COLORS.bronze;
  return COLORS.muted;
};

/**
 * Single leaderboard row.
 */
const LeaderboardRow = ({ entry, isCurrentUser }) => (
  <View style={[styles.row, isCurrentUser && styles.rowHighlight]}>
    {/* Rank */}
    <Text style={[styles.rank, { color: rankColor(entry.rank) }]}>
      {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
    </Text>

    {/* Name + location */}
    <View style={styles.rowMid}>
      <Text style={[styles.rowName, isCurrentUser && styles.rowNameHighlight]}>
        {entry.name}{isCurrentUser ? ' (You)' : ''}
      </Text>
      <Text style={styles.rowLocation}>{entry.city ?? '—'}, {entry.state ?? '—'}</Text>
    </View>

    {/* Stats */}
    <View style={styles.rowRight}>
      <Text style={styles.rowValue}>🪙 {entry.portfolio_value?.toLocaleString()}</Text>
      <Text style={[
        styles.rowGrowth,
        entry.growth_percent >= 0 ? styles.greenText : styles.redText,
      ]}>
        {entry.growth_percent >= 0 ? '+' : ''}{entry.growth_percent}%
      </Text>
    </View>
  </View>
);

/**
 * Sticky footer showing the current user's own rank when not in top 100.
 */
const MyRankFooter = ({ userEntry, scope }) => {
  if (!userEntry) return null;

  const rank = scope === 'national' ? userEntry.national_rank
    : scope === 'state' ? userEntry.state_rank
      : userEntry.city_rank;

  if (!rank) return null;

  return (
    <View style={styles.myRankBar}>
      <Text style={styles.myRankLabel}>Your {scope} rank</Text>
      <Text style={styles.myRankValue}>#{rank}</Text>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const LeaderboardScreen = () => {
  const profile = useAuthStore((s) => s.profile);

  const [scope, setScope] = useState('national');
  const [entries, setEntries] = useState([]);
  const [userEntry, setUserEntry] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Fetch leaderboard ────────────────────────────────────────────────────────

  const loadLeaderboard = useCallback(async (selectedScope, isRefresh = false) => {
    isRefresh ? setIsRefreshing(true) : setIsLoading(true);
    try {
      const res = await fetchLeaderboard(selectedScope);
      if (res.success) {
        setEntries(res.data.entries);
        setUserEntry(res.data.userEntry);
      }
    } catch (err) {
      // Silently fail — empty state handles the UI
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLeaderboard(scope);
  }, [scope]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleScopeChange = (newScope) => {
    setScope(newScope);
    setEntries([]);
  };

  const handleRefresh = () => loadLeaderboard(scope, true);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.container}>
        {/* Header */}
        <Text style={styles.screenTitle}>Leaderboard</Text>

        {/* Scope tabs */}
        <ScopeTabs activeScope={scope} onSelect={handleScopeChange} />

        {/* List */}
        {isLoading ? (
          <ActivityIndicator style={{ flex: 1 }} color={COLORS.green} />
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(item) => item.user_id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={COLORS.green}
              />
            }
            renderItem={({ item }) => (
              <LeaderboardRow
                entry={item}
                isCurrentUser={item.user_id === profile?.id}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No rankings yet</Text>
                <Text style={styles.emptySubtitle}>
                  Start trading to appear on the {scope} leaderboard.
                </Text>
              </View>
            }
          />
        )}

        {/* My rank footer */}
        <MyRankFooter userEntry={userEntry} scope={scope} />
      </View>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },

  // Header
  screenTitle: { fontSize: 22, fontWeight: '700', color: COLORS.white, marginTop: 16, marginBottom: 16, paddingHorizontal: 16 },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: COLORS.green },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.muted },
  tabTextActive: { color: COLORS.background },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
  },
  rowHighlight: { backgroundColor: COLORS.highlight, borderColor: COLORS.green },
  rank: { fontSize: 16, fontWeight: '700', width: 40 },
  rowMid: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  rowNameHighlight: { color: COLORS.green },
  rowLocation: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  rowValue: { fontSize: 13, fontWeight: '700', color: COLORS.gold },
  rowGrowth: { fontSize: 12, fontWeight: '600', marginTop: 3 },
  greenText: { color: COLORS.green },
  redText: { color: '#FF5252' },

  // Empty state
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: COLORS.muted, textAlign: 'center', paddingHorizontal: 32 },

  // My rank footer
  myRankBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  myRankLabel: { fontSize: 14, color: COLORS.muted },
  myRankValue: { fontSize: 16, fontWeight: '700', color: COLORS.green },
});

export default LeaderboardScreen;