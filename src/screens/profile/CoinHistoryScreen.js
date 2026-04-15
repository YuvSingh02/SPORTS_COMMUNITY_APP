// frontend/src/screens/profile/CoinHistoryScreen.js

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { fetchCoinHistory } from '../../services/coinsService';
import useAuthStore from '../../store/authStore';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ACTION_META = {
  daily_login: { label: 'Daily Login', color: '#4CAF50', sign: '+' },
  watch_ad: { label: 'Watched Ad', color: '#4CAF50', sign: '+' },
  referral_reward: { label: 'Referral Reward', color: '#4CAF50', sign: '+' },
  referral_bonus: { label: 'Referral Bonus', color: '#4CAF50', sign: '+' },
  signup_bonus: { label: 'Signup Bonus', color: '#4CAF50', sign: '+' },
  buy_stock: { label: 'Bought Stock', color: '#F44336', sign: '-' },
  sell_stock: { label: 'Sold Stock', color: '#4CAF50', sign: '+' },
  store_purchase: { label: 'Store Purchase', color: '#F44336', sign: '-' },
};

const getMeta = (action) =>
  ACTION_META[action] ?? { label: action, color: '#90A4AE', sign: '+' };

const formatDate = (iso) => {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    '  ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const BalanceCard = ({ balance }) => (
  <View style={styles.balanceCard}>
    <Text style={styles.balanceLabel}>Current Balance</Text>
    <Text style={styles.balanceAmount}>🪙 {balance?.toLocaleString() ?? '—'}</Text>
    <Text style={styles.balanceSub}>Play Coins</Text>
  </View>
);

const HistoryItem = ({ item }) => {
  const meta = getMeta(item.action);
  return (
    <View style={styles.item}>
      <View style={styles.itemLeft}>
        <Text style={styles.itemLabel}>{meta.label}</Text>
        {item.reason ? <Text style={styles.itemReason}>{item.reason}</Text> : null}
        <Text style={styles.itemDate}>{formatDate(item.created_at)}</Text>
      </View>
      <Text style={[styles.itemAmount, { color: meta.color }]}>
        {meta.sign}{item.amount?.toLocaleString()}
      </Text>
    </View>
  );
};

const EmptyState = () => (
  <View style={styles.empty}>
    <Text style={styles.emptyIcon}>🪙</Text>
    <Text style={styles.emptyText}>No transactions yet</Text>
    <Text style={styles.emptySub}>Earn coins by logging in daily or watching ads</Text>
  </View>
);

// ── Main Screen ───────────────────────────────────────────────────────────────

const CoinHistoryScreen = () => {
  const profile = useAuthStore((s) => s.profile);

  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (pageNum = 1, append = false) => {
    try {
      const res = await fetchCoinHistory(pageNum, 20);
      if (res.success) {
        setHistory((prev) => append ? [...prev, ...res.data] : res.data);
        setTotalPages(res.pagination?.totalPages ?? 1);
        setPage(pageNum);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(1);
  };

  const onEndReached = () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    load(page + 1, true);
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator color="#F4A916" size="large" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={({ item }) => <HistoryItem item={item} />}
          ListHeaderComponent={<BalanceCard balance={profile?.play_coins} />}
          ListEmptyComponent={<EmptyState />}
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator color="#F4A916" style={{ margin: 16 }} />
              : null
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F4A916" />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          contentContainerStyle={history.length === 0 && styles.flatListGrow}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  flatListGrow: { flexGrow: 1 },

  balanceCard: {
    margin: 16,
    padding: 24,
    backgroundColor: '#1A1F2E',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F4A91633',
  },
  balanceLabel: { color: '#90A4AE', fontSize: 13, marginBottom: 6 },
  balanceAmount: { color: '#F4A916', fontSize: 36, fontWeight: '800' },
  balanceSub: { color: '#546E7A', fontSize: 12, marginTop: 4 },

  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    backgroundColor: '#1A1F2E',
    borderRadius: 12,
  },
  itemLeft: { flex: 1, marginRight: 12 },
  itemLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  itemReason: { color: '#90A4AE', fontSize: 12, marginTop: 2 },
  itemDate: { color: '#546E7A', fontSize: 11, marginTop: 4 },
  itemAmount: { fontSize: 16, fontWeight: '700' },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  emptySub: { color: '#546E7A', fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 32 },
});

export default CoinHistoryScreen;