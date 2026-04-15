// frontend/src/screens/stocks/PlayerDetailScreen.js

import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { fetchPlayerById } from '../../services/playersService';

// ── Helpers ───────────────────────────────────────────────────────────────────

const formColor = (score) => {
  if (score >= 80) return '#4CAF50';
  if (score >= 50) return '#F4A916';
  return '#F44336';
};

const formLabel = (score) => {
  if (score >= 80) return 'Excellent';
  if (score >= 50) return 'Average';
  return 'Poor';
};

const priceChange = (current, base) => {
  if (!base || base === 0) return { pct: '0.0', up: true };
  const pct = ((current - base) / base) * 100;
  return { pct: Math.abs(pct).toFixed(1), up: pct >= 0 };
};

const fmt = (val, decimals = 0) => {
  if (val === null || val === undefined || val === 0 && decimals > 0) return '—';
  if (decimals > 0) return Number(val).toFixed(decimals);
  return Number(val).toLocaleString();
};

const fmtSR = (val) => {
  if (!val || val === 0) return '—';
  return Number(val).toFixed(2);
};

// ── Sub-components ────────────────────────────────────────────────────────────

const StatBox = ({ label, value }) => (
  <View style={styles.statBox}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const InfoRow = ({ label, value, last }) => (
  <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || '—'}</Text>
  </View>
);

// ── Format Tabs ───────────────────────────────────────────────────────────────

const FORMAT_TABS = ['TEST', 'ODI', 'T20I', 'IPL'];

const FormatStats = ({ stats }) => {
  if (!stats) {
    return <Text style={styles.noStats}>No data available for this format</Text>;
  }

  return (
    <View>
      {/* Batting */}
      <Text style={styles.subSectionTitle}>Batting</Text>
      <View style={styles.statsGrid}>
        <StatBox label="Matches" value={fmt(stats.matches)} />
        <StatBox label="Innings" value={fmt(stats.innings)} />
        <StatBox label="Runs" value={fmt(stats.runs)} />
        <StatBox label="Average" value={fmt(stats.batting_avg, 2)} />
        <StatBox label="Strike Rate" value={fmtSR(stats.strike_rate)} />
        <StatBox label="Highest Score" value={stats.highest_score || '—'} />
        <StatBox label="100s" value={fmt(stats.hundreds)} />
        <StatBox label="50s" value={fmt(stats.fifties)} />
      </View>

      {/* Bowling */}
      <Text style={styles.subSectionTitle}>Bowling</Text>
      <View style={styles.statsGrid}>
        <StatBox label="Wickets" value={fmt(stats.wickets)} />
        <StatBox label="Economy" value={fmt(stats.economy, 2)} />
        <StatBox label="Bowling Avg" value={fmt(stats.bowling_avg, 2)} />
        <StatBox label="Best Figures" value={stats.best_bowling || '—'} />
      </View>

      {/* Fielding */}
      <Text style={styles.subSectionTitle}>Fielding</Text>
      <View style={styles.statsGrid}>
        <StatBox label="Catches" value={fmt(stats.catches)} />
      </View>
    </View>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────

const PlayerDetailScreen = ({ route, navigation }) => {
  const { playerId } = route.params;

  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ODI');
  

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchPlayerById(playerId);
        setPlayer(data);

        // Auto-select first available format tab
        const available = FORMAT_TABS.find(f => data.format_stats?.[f]);
        if (available) setActiveTab(available);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [playerId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#F4A916" size="large" />
      </View>
    );
  }

  if (error || !player) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load player</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { pct, up } = priceChange(player.current_price, player.base_price);
  const fc = formColor(player.form_score);
  const role = player.role ?? 'Cricketer';
  const isWK = role === 'Wicket-Keeper';
  const formatStats = player.format_stats ?? {};
  const hasFormatData = Object.keys(formatStats).length > 0;

  // Sync date
  const syncDate = player.stats_updated_at
    ? new Date(player.stats_updated_at).toLocaleDateString()
    : null;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>← Back</Text>
      </TouchableOpacity>

      {/* Hero card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.playerName}>{player.name}</Text>
            <Text style={styles.playerMeta}>
              {player.team !== 'Unknown' ? player.team : '—'}
              {'  ·  '}
              {player.country !== 'Unknown' ? player.country : '—'}
            </Text>
            <Text style={styles.roleTag}>{role}</Text>
          </View>
          <View style={[styles.formBadge, { backgroundColor: fc + '22', borderColor: fc }]}>
            <Text style={[styles.formText, { color: fc }]}>{formLabel(player.form_score)}</Text>
          </View>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.price}>🪙 {player.current_price?.toLocaleString()}</Text>
          <Text style={[styles.priceChange, { color: up ? '#4CAF50' : '#F44336' }]}>
            {up ? '▲' : '▼'} {pct}%
          </Text>
        </View>

        <View style={styles.formBarBg}>
          <View style={[styles.formBarFill, { width: `${player.form_score ?? 0}%`, backgroundColor: fc }]} />
        </View>
        <Text style={[styles.formScore, { color: fc }]}>Form: {player.form_score ?? '—'}/100</Text>
      </View>

      {/* Stats section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Career Stats</Text>
        {syncDate
          ? <Text style={styles.syncDate}>Synced {syncDate}</Text>
          : <Text style={styles.syncDate}>⚠ Not yet synced</Text>
        }
      </View>

      {hasFormatData ? (
        <>
          {/* Format tabs */}
          <View style={styles.tabRow}>
            {FORMAT_TABS.map(tab => {
              const hasData = !!formatStats[tab];
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tab,
                    isActive && styles.tabActive,
                    !hasData && styles.tabDisabled,
                  ]}
                  onPress={() => hasData && setActiveTab(tab)}
                  disabled={!hasData}
                >
                  <Text style={[
                    styles.tabText,
                    isActive && styles.tabTextActive,
                    !hasData && styles.tabTextDisabled,
                  ]}>
                    {tab}
                  </Text>
                  {hasData && (
                    <Text style={[styles.tabMatches, isActive && { color: '#F4A916' }]}>
                      {formatStats[tab].matches}m
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Active tab stats */}
          <View style={styles.formatStatsContainer}>
            <FormatStats stats={formatStats[activeTab]} />
          </View>
        </>
      ) : (
        <Text style={styles.noStats}>⚠ Stats not yet scraped for this player</Text>
      )}

      {/* Player Info */}
      <Text style={styles.sectionTitle}>Player Info</Text>
      <View style={styles.infoCard}>
        <InfoRow label="Full Name" value={player.name} />
        <InfoRow label="Team" value={player.team !== 'Unknown' ? player.team : null} />
        <InfoRow label="Country" value={player.country !== 'Unknown' ? player.country : null} />
        <InfoRow label="Role" value={role} />
        <InfoRow label="Batting Style" value={player.batting_style} />
        <InfoRow label="Bowling Style" value={player.bowling_style} />
        <InfoRow label="Tradeable" value={player.is_tradeable ? '✅ Yes' : '❌ No'} />
        <InfoRow label="Status" value={player.is_active ? 'Active' : 'Inactive'} last />
      </View>

      {/* Buy button — only if tradeable */}
      {player.is_tradeable && (
        <TouchableOpacity
          style={styles.buyBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('BuyStock', { player })}
        >
          <Text style={styles.buyBtnText}>Buy Stock  🪙 {player.current_price?.toLocaleString()}</Text>
        </TouchableOpacity>
      )}

      {player.is_tradeable && (
        <TouchableOpacity
          style={styles.sellBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('SellStock', { player })}
        >
          <Text style={styles.sellBtnText}>Sell Stock</Text>
        </TouchableOpacity>
      )}

      {!player.is_tradeable && (
        <View style={styles.notTradeableBox}>
          <Text style={styles.notTradeableText}>This player is not available for trading</Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  center: { flex: 1, backgroundColor: '#0A0E17', alignItems: 'center', justifyContent: 'center' },

  backBtn: { marginTop: 56, marginLeft: 16, marginBottom: 8 },
  backBtnText: { color: '#90A4AE', fontSize: 15 },

  heroCard: {
    margin: 16, padding: 20,
    backgroundColor: '#1A1F2E',
    borderRadius: 16,
    borderWidth: 1, borderColor: '#1E2535',
  },
  heroTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 16,
  },
  playerName: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  playerMeta: { color: '#90A4AE', fontSize: 13, marginTop: 4 },
  roleTag: { color: '#546E7A', fontSize: 12, marginTop: 4 },
  formBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  formText: { fontSize: 12, fontWeight: '700' },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  price: { color: '#F4A916', fontSize: 26, fontWeight: '800' },
  priceChange: { fontSize: 15, fontWeight: '600' },

  formBarBg: { height: 6, backgroundColor: '#0A0E17', borderRadius: 3, marginBottom: 6 },
  formBarFill: { height: 6, borderRadius: 3 },
  formScore: { fontSize: 12, fontWeight: '600' },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16, marginTop: 24, marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFFFFF', fontSize: 16, fontWeight: '700',
    marginHorizontal: 16, marginTop: 24, marginBottom: 8,
  },
  subSectionTitle: {
    color: '#90A4AE', fontSize: 13, fontWeight: '600',
    marginHorizontal: 16, marginTop: 16, marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  syncDate: { color: '#546E7A', fontSize: 11 },

  // Format tabs
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 4,
    gap: 8,
  },
  tab: {
    flex: 1, alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#1A1F2E',
    borderRadius: 10,
    borderWidth: 1, borderColor: '#1E2535',
  },
  tabActive: {
    backgroundColor: '#F4A91622',
    borderColor: '#F4A916',
  },
  tabDisabled: {
    opacity: 0.3,
  },
  tabText: { color: '#90A4AE', fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: '#F4A916' },
  tabTextDisabled: { color: '#546E7A' },
  tabMatches: { color: '#546E7A', fontSize: 10, marginTop: 2 },

  formatStatsContainer: { marginTop: 8 },

  noStats: {
    color: '#546E7A', fontSize: 13,
    marginHorizontal: 16, marginTop: 12, marginBottom: 8,
  },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    marginHorizontal: 16, gap: 10, marginBottom: 4,
  },
  statBox: {
    width: '47%',
    backgroundColor: '#1A1F2E',
    borderRadius: 12, padding: 16,
    alignItems: 'center',
    borderWidth: 1, borderColor: '#1E2535',
  },
  statValue: { color: '#F4A916', fontSize: 18, fontWeight: '800' },
  statLabel: { color: '#90A4AE', fontSize: 12, marginTop: 4 },

  infoCard: {
    marginHorizontal: 16,
    backgroundColor: '#1A1F2E',
    borderRadius: 12,
    borderWidth: 1, borderColor: '#1E2535',
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#0A0E17',
  },
  infoLabel: { color: '#90A4AE', fontSize: 14 },
  infoValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  buyBtn: {
    margin: 16, marginTop: 24,
    backgroundColor: '#00C853',
    borderRadius: 14, padding: 18,
    alignItems: 'center',
    sellBtn     : { backgroundColor: '#FF5252', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
sellBtnText : { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  },
  buyBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },

  notTradeableBox: {
    margin: 16, marginTop: 24,
    backgroundColor: '#1A1F2E',
    borderRadius: 14, padding: 18,
    alignItems: 'center',
    borderWidth: 1, borderColor: '#1E2535',
  },
  notTradeableText: { color: '#546E7A', fontSize: 14 },

  errorText: { color: '#F44336', fontSize: 16, marginBottom: 12 },
  backLink: { color: '#90A4AE', fontSize: 14 },
});

export default PlayerDetailScreen;