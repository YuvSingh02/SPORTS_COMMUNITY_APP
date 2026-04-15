// screens/stocks/HomeScreen.js

import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, RefreshControl, SafeAreaView, StatusBar,
} from 'react-native';
import { fetchLiveMatches } from '../../services/matchesService';
import { fetchPlayerCount } from '../../services/playersService';
import { Colors, Typography, Spacing, Radius } from '../../constants/colors';

const MatchCard = ({ match }) => {
  const isLive = !match.matchEnded && match.matchStarted;
  const score1 = match.score?.[0];
  const score2 = match.score?.[1];

  return (
    <View style={s.matchCard}>
      <View style={s.matchCardTop}>
        <View style={s.matchMeta}>
          <Text style={s.matchType}>{match.matchType?.toUpperCase() ?? 'CRICKET'}</Text>
          <View style={[s.liveChip, !isLive && s.liveChipDone]}>
            <View style={[s.liveDot, !isLive && s.liveDotDone]} />
            <Text style={[s.liveChipText, !isLive && s.liveChipTextDone]}>
              {isLive ? 'LIVE' : 'ENDED'}
            </Text>
          </View>
        </View>
      </View>

      <Text style={s.matchName} numberOfLines={2}>{match.name}</Text>

      {(score1 || score2) && (
        <View style={s.scoresWrap}>
          {score1 && (
            <Text style={s.scoreRow}>
              <Text style={s.scoreTeam}>{score1.inning?.split(' Inning')[0]}  </Text>
              <Text style={s.scoreRuns}>{score1.r}/{score1.w}</Text>
              <Text style={s.scoreOvers}>  ({score1.o} ov)</Text>
            </Text>
          )}
          {score2 && (
            <Text style={s.scoreRow}>
              <Text style={s.scoreTeam}>{score2.inning?.split(' Inning')[0]}  </Text>
              <Text style={s.scoreRuns}>{score2.r}/{score2.w}</Text>
              <Text style={s.scoreOvers}>  ({score2.o} ov)</Text>
            </Text>
          )}
        </View>
      )}

      <Text style={[s.matchStatus, isLive && s.matchStatusLive]} numberOfLines={2}>
        {match.status}
      </Text>

      <Text style={s.venue} numberOfLines={1}>📍 {match.venue}</Text>
    </View>
  );
};

const HomeScreen = ({ navigation }) => {
  const [matches, setMatches] = useState([]);
  const [playerCount, setPlayerCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [matchData, count] = await Promise.all([
        fetchLiveMatches(),
        fetchPlayerCount(),
      ]);
      setMatches(matchData);
      setPlayerCount(count);
    } catch (err) {
      console.log('[HomeScreen] error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const liveMatches = matches.filter(m => !m.matchEnded);
  const recentMatches = matches.filter(m => m.matchEnded).slice(0, 5);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadData(); }}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>Markets</Text>
            <Text style={s.headerSub}>Buy & sell player stocks</Text>
          </View>
        </View>

        {/* Market cards */}
        <View style={s.section}>
          <TouchableOpacity
            style={s.marketCard}
            onPress={() => navigation.navigate('PlayerList')}
            activeOpacity={0.75}
          >
            <View style={s.marketCardLeft}>
              <View style={s.marketIconWrap}>
                <Text style={s.marketIcon}>🏏</Text>
              </View>
              <View>
                <Text style={s.marketTitle}>Cricket Players</Text>
                <Text style={s.marketSub}>
                  {playerCount ?? '—'} players · IND, ENG, AUS & more
                </Text>
              </View>
            </View>
            <Text style={s.marketArrow}>›</Text>
          </TouchableOpacity>

          <View style={[s.marketCard, s.marketCardDisabled]}>
            <View style={s.marketCardLeft}>
              <View style={s.marketIconWrap}>
                <Text style={s.marketIcon}>⚽</Text>
              </View>
              <View>
                <Text style={s.marketTitle}>Football Players</Text>
                <Text style={s.marketSub}>Coming soon</Text>
              </View>
            </View>
            <View style={s.soonChip}>
              <Text style={s.soonChipText}>Soon</Text>
            </View>
          </View>
        </View>

        {/* Matches */}
        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={s.loadingText}>Loading matches…</Text>
          </View>
        ) : (
          <>
            {liveMatches.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Live Now</Text>
                {liveMatches.map(m => <MatchCard key={m.id} match={m} />)}
              </View>
            )}
            {recentMatches.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Recent Matches</Text>
                {recentMatches.map(m => <MatchCard key={m.id} match={m} />)}
              </View>
            )}
            {matches.length === 0 && (
              <View style={s.emptyWrap}>
                <Text style={s.emptyTitle}>No matches right now</Text>
                <Text style={s.emptyText}>Check back soon</Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.base,
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

  section: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },

  // Market cards
  marketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
  },
  marketCardDisabled: { opacity: 0.45 },
  marketCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  marketIconWrap: {
    width: 44, height: 44, borderRadius: Radius.md,
    backgroundColor: Colors.bgSunken,
    alignItems: 'center', justifyContent: 'center',
  },
  marketIcon: { fontSize: 22 },
  marketTitle: { color: Colors.textPrimary, fontSize: Typography.fontSizes.base, fontWeight: Typography.fontWeights.semibold },
  marketSub: { color: Colors.textMuted, fontSize: Typography.fontSizes.sm, marginTop: 2 },
  marketArrow: { color: Colors.primary, fontSize: 26 },

  soonChip: {
    backgroundColor: Colors.accentDim,
    borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  soonChipText: { color: Colors.accent, fontSize: Typography.fontSizes.xs, fontWeight: Typography.fontWeights.semibold },

  // Match card
  matchCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
  },
  matchCardTop: { marginBottom: Spacing.sm },
  matchMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  matchType: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  liveChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1DB95418',
    borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  liveChipDone: { backgroundColor: Colors.bgSunken },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.primary },
  liveDotDone: { backgroundColor: Colors.textMuted },
  liveChipText: { color: Colors.primary, fontSize: Typography.fontSizes.xs, fontWeight: Typography.fontWeights.bold },
  liveChipTextDone: { color: Colors.textMuted },

  matchName: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    lineHeight: 21,
    marginBottom: Spacing.sm,
  },

  scoresWrap: { marginBottom: Spacing.sm, gap: 3 },
  scoreRow: { fontSize: Typography.fontSizes.sm },
  scoreTeam: { color: Colors.textSecondary, fontWeight: Typography.fontWeights.medium },
  scoreRuns: { color: Colors.primary, fontWeight: Typography.fontWeights.bold },
  scoreOvers: { color: Colors.textMuted },

  matchStatus: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.sm,
    lineHeight: 18,
    marginBottom: 4,
  },
  matchStatusLive: { color: Colors.primary },

  venue: { color: Colors.textMuted, fontSize: Typography.fontSizes.xs, marginTop: 2 },

  loadingWrap: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  loadingText: { color: Colors.textMuted, fontSize: Typography.fontSizes.sm },

  emptyWrap: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { color: Colors.textSecondary, fontSize: Typography.fontSizes.md, fontWeight: Typography.fontWeights.semibold },
  emptyText: { color: Colors.textMuted, fontSize: Typography.fontSizes.sm, marginTop: 6 },
});

export default HomeScreen;