// frontend/src/screens/stocks/PlayerListScreen.js

import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, RefreshControl, StatusBar
} from 'react-native';
import { fetchAllPlayers } from '../../services/playersService';

const TEAMS = ['All', 'India', 'England', 'Australia', 'New Zealand', 'South Africa', 'Sri Lanka', 'Pakistan', 'Bangladesh', 'Afghanistan'];

const FORM_COLOR = (score) => {
    if (score >= 85) return '#00C853';
    if (score >= 75) return '#FFD600';
    return '#FF3D00';
};

export default function PlayerListScreen({ navigation }) {
    const [players, setPlayers] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedTeam, setTeam] = useState('All');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const loadPlayers = async () => {
        try {
            setError(null);
            const data = await fetchAllPlayers();
            setPlayers(data);
            setFiltered(data);
        } catch (err) {
            setError('Could not load players. Check your connection.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { loadPlayers(); }, []);

    useEffect(() => {
        let result = players;

        if (selectedTeam !== 'All') {
            result = result.filter(p => {
                const team = (p.team ?? '').toLowerCase();
                const country = (p.country ?? '').toLowerCase();
                const filter = selectedTeam.toLowerCase();
                return team === filter || country === filter;
            });
        }

        if (search.trim()) {
            result = result.filter(p =>
                p.name.toLowerCase().includes(search.toLowerCase())
            );
        }

        setFiltered(result);
    }, [search, selectedTeam, players]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadPlayers();
    }, []);

    const renderTeamFilter = ({ item }) => (
        <TouchableOpacity
            style={[styles.teamChip, selectedTeam === item && styles.teamChipActive]}
            onPress={() => setTeam(item)}
        >
            <Text style={[styles.teamChipText, selectedTeam === item && styles.teamChipTextActive]}>
                {item}
            </Text>
        </TouchableOpacity>
    );

    const renderPlayer = ({ item }) => (
        <TouchableOpacity
            style={styles.playerCard}
            onPress={() => navigation.navigate('PlayerProfile', { playerId: item.id, playerName: item.name })}
            activeOpacity={0.75}
        >
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                    {item.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </Text>
            </View>

            <View style={styles.playerInfo}>
                <Text style={styles.playerName}>{item.name}</Text>
                <Text style={styles.playerTeam}>
                    {item.country && item.country !== 'Unknown' ? item.country : '—'}
                    {' · '}
                    {item.position || 'ALL'}
                </Text>
            </View>

            <View style={styles.playerRight}>
                <Text style={styles.playerPrice}>🪙 {item.current_price?.toLocaleString()}</Text>
                <View style={[styles.formBadge, { backgroundColor: FORM_COLOR(item.form_score) + '22' }]}>
                    <Text style={[styles.formText, { color: FORM_COLOR(item.form_score) }]}>
                        {item.form_score} form
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (loading) return (
        <View style={styles.centered}>
            <ActivityIndicator size="large" color="#00C853" />
            <Text style={styles.loadingText}>Loading players...</Text>
        </View>
    );

    if (error) return (
        <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadPlayers}>
                <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search players..."
                    placeholderTextColor="#555"
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            <FlatList
                data={TEAMS}
                horizontal
                keyExtractor={t => t}
                renderItem={renderTeamFilter}
                showsHorizontalScrollIndicator={false}
                style={styles.teamFilter}
                contentContainerStyle={{ paddingHorizontal: 16 }}
            />

            <Text style={styles.resultCount}>{filtered.length} players</Text>

            <FlatList
                data={filtered}
                keyExtractor={item => String(item.id)}
                renderItem={renderPlayer}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00C853" />
                }
                ListEmptyComponent={
                    <View style={styles.centered}>
                        <Text style={styles.emptyText}>No players found</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0E17' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },
    loadingText: { color: '#888', marginTop: 12, fontSize: 14 },
    errorText: { color: '#FF3D00', fontSize: 15, textAlign: 'center', marginHorizontal: 32 },
    retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#00C853', borderRadius: 8 },
    retryText: { color: '#000', fontWeight: '700' },

    searchContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    searchInput: { backgroundColor: '#161B27', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, color: '#FFF', fontSize: 15, borderWidth: 1, borderColor: '#1E2535' },

    teamFilter: { maxHeight: 44, marginBottom: 4 },
    teamChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#161B27', marginRight: 8, borderWidth: 1, borderColor: '#1E2535' },
    teamChipActive: { backgroundColor: '#00C853', borderColor: '#00C853' },
    teamChipText: { color: '#888', fontSize: 13, fontWeight: '600' },
    teamChipTextActive: { color: '#000' },

    resultCount: { color: '#555', fontSize: 12, paddingHorizontal: 16, marginBottom: 8, marginTop: 4 },

    playerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B27', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#1E2535' },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1E2535', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { color: '#00C853', fontWeight: '700', fontSize: 15 },
    playerInfo: { flex: 1 },
    playerName: { color: '#FFF', fontSize: 15, fontWeight: '600', marginBottom: 3 },
    playerTeam: { color: '#888', fontSize: 12 },
    playerRight: { alignItems: 'flex-end' },
    playerPrice: { color: '#FFF', fontWeight: '700', fontSize: 15, marginBottom: 4 },
    formBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    formText: { fontSize: 11, fontWeight: '700' },
    emptyText: { color: '#555', fontSize: 15 },
});