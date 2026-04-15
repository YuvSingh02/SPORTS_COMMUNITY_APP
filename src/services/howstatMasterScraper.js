// backend/src/services/howstatMasterScraper.js
'use strict';

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TRADEABLE_THRESHOLD = 10;
const DELAY_MS = 1500;
const PLAYER_LIST_URL = 'https://www.howstat.com/cricket/Statistics/Players/PlayerList.asp';

const http = axios.create({
    timeout: 30000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Format page URLs ──────────────────────────────────────────────────────────
const FORMAT_URLS = {
    TEST: (id) => `https://www.howstat.com/Cricket/Statistics/Players/PlayerOverview.asp?PlayerID=${id}`,
    ODI: (id) => `https://www.howstat.com/Cricket/Statistics/Players/PlayerOverview_ODI.asp?PlayerID=${id}`,
    T20I: (id) => `https://www.howstat.com/Cricket/Statistics/Players/PlayerOverview_T20.asp?PlayerID=${id}`,
    IPL: (id) => `https://www.howstat.com/Cricket/Statistics/IPL/PlayerOverview.asp?PlayerID=${id}`,
};

// ── Fetch all player IDs from HowStat master list ─────────────────────────────
async function fetchAllPlayerIds() {
    console.log('[howstat] Fetching player list...');
    const res = await http.get(PLAYER_LIST_URL);
    const $ = cheerio.load(res.data);

    const playerMap = {};
    $('a[href*="PlayerOverviewSummary"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const match = href.match(/PlayerID=(\d+)/i);
        const name = $(el).text().trim();
        if (match && name && name.length > 1) {
            playerMap[match[1]] = name;
        }
    });

    const players = Object.entries(playerMap).map(([id, name]) => ({ id, name }));
    console.log(`[howstat] Found ${players.length} players.`);
    return players;
}

// ── Parse a single format page ────────────────────────────────────────────────
function parseFormatPage(html) {
    const $ = cheerio.load(html);
    const stats = {
        matches: 0, innings: 0, runs: 0, batting_avg: 0, strike_rate: 0,
        hundreds: 0, fifties: 0, highest_score: '-',
        wickets: 0, bowling_avg: 0, economy: 0, best_bowling: '-',
        catches: 0,
    };

    let section = 'batting';
    let hasBatting = false;

    $('table tr').each((_, row) => {
        const cells = $(row).find('td').map((__, td) => $(td).text().trim()).get();
        if (cells.length < 2) return;

        const label = cells[0].replace(':', '').trim().toLowerCase();
        const value = cells[1].trim();

        // Section detection
        if (['balls', 'maidens', 'runs conceded', 'wickets'].includes(label)) section = 'bowling';
        if (label === 'catches') section = 'fielding';

        if (section === 'batting') {
            if (label === 'matches') {
                const m = value.match(/^(\d+)/);
                stats.matches = m ? parseInt(m[1]) : 0;
                hasBatting = true;
            }
            if (label === 'innings') stats.innings = parseInt(value) || 0;
            if (label === 'aggregate') stats.runs = parseFloat(value) || 0;
            if (label === 'average') stats.batting_avg = parseFloat(value) || 0;
            if (label === 'scoring rate') stats.strike_rate = parseFloat(value) || 0;
            if (label === '100s') stats.hundreds = parseInt(value) || 0;
            if (label === '50s') stats.fifties = parseInt(value) || 0;
            if (label === 'highest score') stats.highest_score = value || '-';
        }

        if (section === 'bowling') {
            if (label === 'wickets') stats.wickets = parseInt(value) || 0;
            if (label === 'economy rate') stats.economy = parseFloat(value) || 0;
            if (label === 'best - innings') stats.best_bowling = value || '-';
            if (label === 'average' && value !== 'N/A') {
                stats.bowling_avg = parseFloat(value) || 0;
            }
        }

        if (section === 'fielding') {
            if (label === 'catches') stats.catches = parseInt(value) || 0;
        }
    });

    return hasBatting ? stats : null;
}

// ── Scrape all 4 formats for a player ────────────────────────────────────────
async function scrapePlayerFormats(id) {
    const formats = {};
    let totalIntlMatches = 0;

    for (const [format, urlFn] of Object.entries(FORMAT_URLS)) {
        try {
            const res = await http.get(urlFn(id));
            const stats = parseFormatPage(res.data);
            if (stats && stats.matches > 0) {
                formats[format] = stats;
                if (['TEST', 'ODI', 'T20I'].includes(format)) {
                    totalIntlMatches += stats.matches;
                }
            }
        } catch (err) {
            // Silent — player may not have played this format
        }
        await sleep(300);
    }

    return { formats, totalIntlMatches };
}

// ── Calculate form score from combined stats ──────────────────────────────────
function calculateFormScore(formats) {
    let score = 0;
    const intlFormats = ['TEST', 'ODI', 'T20I'].filter(f => formats[f]);

    if (intlFormats.length === 0) return 40;

    // Batting score — use best average across formats
    const bestAvg = Math.max(...intlFormats.map(f => formats[f].batting_avg || 0));
    const bestSR = Math.max(...intlFormats.map(f => formats[f].strike_rate || 0));
    score += (Math.min(bestAvg, 60) / 60) * 35;
    score += (Math.min(bestSR, 150) / 150) * 15;

    // Hundreds bonus
    const totalHundreds = intlFormats.reduce((s, f) => s + (formats[f].hundreds || 0), 0);
    score += Math.min(totalHundreds * 1.5, 15);

    // Bowling score
    const totalWickets = intlFormats.reduce((s, f) => s + (formats[f].wickets || 0), 0);
    score += Math.min(totalWickets * 0.3, 15);

    const bestEcon = Math.min(...intlFormats.map(f => formats[f].economy || 99).filter(e => e > 0));
    if (bestEcon < 99) score += Math.max(0, (10 - bestEcon) / 10) * 10;

    return Math.min(Math.round(score), 100);
}

function calculatePrice(formScore) {
    return Math.round(500 + (formScore / 100) * 2000);
}

// ── Upsert player to Supabase players table ───────────────────────────────────
async function upsertPlayer(id, name, totalIntlMatches, formats, formScore, price) {
    const isTradeable = totalIntlMatches >= TRADEABLE_THRESHOLD;

    // Build combined stats from all international formats
    const intl = ['TEST', 'ODI', 'T20I'].filter(f => formats[f]);
    const totalRuns = intl.reduce((s, f) => s + (formats[f].runs || 0), 0);
    const totalWickets = intl.reduce((s, f) => s + (formats[f].wickets || 0), 0);
    const totalCatches = intl.reduce((s, f) => s + (formats[f].catches || 0), 0);
    const totalHundreds = intl.reduce((s, f) => s + (formats[f].hundreds || 0), 0);
    const totalFifties = intl.reduce((s, f) => s + (formats[f].fifties || 0), 0);
    const bestAvg = intl.length > 0
        ? Math.max(...intl.map(f => formats[f].batting_avg || 0))
        : 0;
    const bestEcon = intl.filter(f => formats[f].economy > 0).length > 0
        ? Math.min(...intl.filter(f => formats[f].economy > 0).map(f => formats[f].economy))
        : 0;

    const payload = {
        howstat_id: parseInt(id),
        name,
        sport: 'cricket',
        is_tradeable: isTradeable,
        form_score: formScore,
        current_price: price,
        base_price: 1000,
        // Combined career stats
        bat_runs: totalRuns,
        bat_average: bestAvg,
        bat_hundreds: totalHundreds,
        bat_fifties: totalFifties,
        bowl_wickets: totalWickets,
        bowl_economy: bestEcon,
        catches: totalCatches,
        stats_updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
        .from('players')
        .select('id')
        .eq('howstat_id', parseInt(id))
        .maybeSingle();

    if (existing) {
        const { error } = await supabase
            .from('players')
            .update(payload)
            .eq('howstat_id', parseInt(id));
        if (error) throw new Error(`players update: ${error.message}`);
    } else {
        const { error } = await supabase
            .from('players')
            .insert({ ...payload, team: 'Unknown', country: 'Unknown', position: 'Unknown' });
        if (error) throw new Error(`players insert: ${error.message}`);
    }
}

// ── Upsert per-format stats to player_stats table ────────────────────────────
async function upsertFormatStats(howstatId, formats) {
    for (const [format, stats] of Object.entries(formats)) {
        const { error } = await supabase
            .from('player_stats')
            .upsert({
                howstat_id: parseInt(howstatId),
                format,
                matches: stats.matches || 0,
                innings: stats.innings || 0,
                runs: stats.runs || 0,
                batting_avg: stats.batting_avg || 0,
                strike_rate: stats.strike_rate || 0,
                hundreds: stats.hundreds || 0,
                fifties: stats.fifties || 0,
                highest_score: stats.highest_score || '-',
                wickets: stats.wickets || 0,
                bowling_avg: stats.bowling_avg || 0,
                economy: stats.economy || 0,
                best_bowling: stats.best_bowling || '-',
                catches: stats.catches || 0,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'howstat_id,format' });

        if (error) {
            console.error(`  [supabase] player_stats upsert failed id=${howstatId} fmt=${format}: ${error.message}`);
        }
    }
}

// ── Main scrape function ──────────────────────────────────────────────────────
async function scrapeAllPlayersFromHowstat() {
    console.log('[howstat] ══════════════════════════════════');
    console.log('[howstat] Starting full scrape...');
    console.log('[howstat] ══════════════════════════════════');

    const players = await fetchAllPlayerIds();
    let success = 0, failed = 0;

    for (let i = 0; i < players.length; i++) {
        const { id, name } = players[i];
        process.stdout.write(`[howstat] [${i + 1}/${players.length}] ${name} ... `);

        try {
            const { formats, totalIntlMatches } = await scrapePlayerFormats(id);
            const formScore = calculateFormScore(formats);
            const price = calculatePrice(formScore);

            await upsertPlayer(id, name, totalIntlMatches, formats, formScore, price);
            await upsertFormatStats(id, formats);

            console.log(`✓ intl=${totalIntlMatches} tradeable=${totalIntlMatches >= TRADEABLE_THRESHOLD} form=${formScore} formats=[${Object.keys(formats).join(',')}]`);
            success++;
        } catch (err) {
            console.log(`✗ ${err.message}`);
            failed++;
        }

        await sleep(DELAY_MS);
    }

    console.log('[howstat] ══════════════════════════════════');
    console.log(`[howstat] Done — ✓ ${success} | ✗ ${failed}`);
    console.log('[howstat] ══════════════════════════════════');
}

module.exports = { scrapeAllPlayersFromHowstat };