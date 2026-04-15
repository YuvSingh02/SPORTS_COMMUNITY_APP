// backend/src/services/cricketDataService.js

const axios = require('axios');
const config = require('../config/env');

const API_KEY = config.cricketApi.key;
console.log('[cricketDataService] API_KEY loaded:', API_KEY ? 'YES' : 'NO - KEY IS EMPTY');

const BASE_URL = 'https://api.cricapi.com/v1';

async function getCurrentMatches() {
    try {
        const url = `${BASE_URL}/currentMatches?apikey=${API_KEY}&offset=0`;
        console.log('[cricketDataService] Calling URL:', url);

        const res = await axios.get(url);

        console.log('[cricketDataService] Full response:', JSON.stringify(res.data));

        const data = res.data?.data;
        if (!data || !Array.isArray(data)) return [];

        return data.sort((a, b) => {
            if (!a.matchEnded && b.matchEnded) return -1;
            if (a.matchEnded && !b.matchEnded) return 1;
            return 0;
        });
    } catch (err) {
        console.error('[cricketDataService] Full error:', err.response?.data || err.message);
        return [];
    }
}

async function getMatchScorecard(matchId) {
    try {
        const res = await axios.get(`${BASE_URL}/match_scorecard`, {
            params: { apikey: API_KEY, id: matchId },
        });
        if (!res.data || res.data.status !== 'success') return null;
        return res.data.data || null;
    } catch (err) {
        console.error('[cricketDataService] getMatchScorecard failed:', err.message);
        return null;
    }
}

async function searchPlayer(name) {
    try {
        const res = await axios.get(`${BASE_URL}/players`, {
            params: { apikey: API_KEY, search: name, offset: 0 },
        });
        if (!res.data || res.data.status !== 'success') return null;
        const results = res.data.data || [];
        return results[0] || null;
    } catch (err) {
        console.error('[cricketDataService] searchPlayer failed:', err.message);
        return null;
    }
}

module.exports = { getCurrentMatches, getMatchScorecard, searchPlayer };