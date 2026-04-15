// backend/testFullScraper.js
require('dotenv').config();
const { scrapeAllPlayersFromHowstat } = require('./src/services/howstatMasterScraper');

// Patch to only run 3 players for testing
const axios = require('axios');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const http = axios.create({
    timeout: 30000,
    headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0' },
});
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const FORMAT_URLS = {
    TEST: (id) => `https://www.howstat.com/Cricket/Statistics/Players/PlayerOverview.asp?PlayerID=${id}`,
    ODI: (id) => `https://www.howstat.com/Cricket/Statistics/Players/PlayerOverview_ODI.asp?PlayerID=${id}`,
    T20I: (id) => `https://www.howstat.com/Cricket/Statistics/Players/PlayerOverview_T20.asp?PlayerID=${id}`,
    IPL: (id) => `https://www.howstat.com/Cricket/Statistics/IPL/PlayerOverview.asp?PlayerID=${id}`,
};

const TEST_PLAYERS = [
    { id: '3600', name: 'Virat Kohli' },
    { id: '3474', name: 'Rohit Sharma' },
    { id: '2939', name: 'MS Dhoni' },
];

function parseFormatPage(html) {
    const $ = cheerio.load(html);
    const stats = {
        matches: 0, innings: 0, runs: 0, batting_avg: 0, strike_rate: 0,
        hundreds: 0, fifties: 0, highest_score: '-',
        wickets: 0, bowling_avg: 0, economy: 0, best_bowling: '-',
        catches: 0,
    };
    let section = 'batting', hasBatting = false;

    $('table tr').each((_, row) => {
        const cells = $(row).find('td').map((__, td) => $(td).text().trim()).get();
        if (cells.length < 2) return;
        const label = cells[0].replace(':', '').trim().toLowerCase();
        const value = cells[1].trim();

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
            if (label === 'average' && value !== 'N/A') stats.bowling_avg = parseFloat(value) || 0;
        }
        if (section === 'fielding') {
            if (label === 'catches') stats.catches = parseInt(value) || 0;
        }
    });

    return hasBatting ? stats : null;
}

function calculateFormScore(formats) {
    let score = 0;
    const intlFormats = ['TEST', 'ODI', 'T20I'].filter(f => formats[f]);
    if (intlFormats.length === 0) return 40;

    const bestAvg = Math.max(...intlFormats.map(f => formats[f].batting_avg || 0));
    const bestSR = Math.max(...intlFormats.map(f => formats[f].strike_rate || 0));
    score += (Math.min(bestAvg, 60) / 60) * 35;
    score += (Math.min(bestSR, 150) / 150) * 15;

    const totalHundreds = intlFormats.reduce((s, f) => s + (formats[f].hundreds || 0), 0);
    score += Math.min(totalHundreds * 1.5, 15);

    const totalWickets = intlFormats.reduce((s, f) => s + (formats[f].wickets || 0), 0);
    score += Math.min(totalWickets * 0.3, 15);

    const econValues = intlFormats.map(f => formats[f].economy || 0).filter(e => e > 0);
    if (econValues.length > 0) {
        const bestEcon = Math.min(...econValues);
        score += Math.max(0, (10 - bestEcon) / 10) * 10;
    }

    return Math.min(Math.round(score), 100);
}

function calculatePrice(formScore) {
    return Math.round(500 + (formScore / 100) * 2000);
}

async function main() {
    console.log('[test] Running scraper on 3 players...\n');

    for (const { id, name } of TEST_PLAYERS) {
        console.log(`\n══════ ${name} (ID=${id}) ══════`);
        const formats = {};
        let totalIntlMatches = 0;

        for (const [format, urlFn] of Object.entries(FORMAT_URLS)) {
            try {
                const res = await http.get(urlFn(id));
                const stats = parseFormatPage(res.data);
                if (stats && stats.matches > 0) {
                    formats[format] = stats;
                    if (['TEST', 'ODI', 'T20I'].includes(format)) totalIntlMatches += stats.matches;
                    console.log(`  ${format}: matches=${stats.matches} runs=${stats.runs} avg=${stats.batting_avg} 100s=${stats.hundreds} wickets=${stats.wickets}`);
                } else {
                    console.log(`  ${format}: no stats`);
                }
            } catch (err) {
                console.log(`  ${format}: ERROR — ${err.message}`);
            }
            await sleep(400);
        }

        const formScore = calculateFormScore(formats);
        const price = calculatePrice(formScore);
        console.log(`  → form=${formScore} price=${price} tradeable=${totalIntlMatches >= 10}`);

        // Save to Supabase
        try {
            const intl = ['TEST', 'ODI', 'T20I'].filter(f => formats[f]);
            const payload = {
                howstat_id: parseInt(id),
                name,
                sport: 'cricket',
                is_tradeable: totalIntlMatches >= 10,
                form_score: formScore,
                current_price: price,
                base_price: 1000,
                bat_runs: intl.reduce((s, f) => s + (formats[f].runs || 0), 0),
                bat_average: intl.length > 0 ? Math.max(...intl.map(f => formats[f].batting_avg || 0)) : 0,
                bat_hundreds: intl.reduce((s, f) => s + (formats[f].hundreds || 0), 0),
                bat_fifties: intl.reduce((s, f) => s + (formats[f].fifties || 0), 0),
                bowl_wickets: intl.reduce((s, f) => s + (formats[f].wickets || 0), 0),
                bowl_economy: intl.filter(f => formats[f].economy > 0).length > 0
                    ? Math.min(...intl.filter(f => formats[f].economy > 0).map(f => formats[f].economy))
                    : 0,
                catches: intl.reduce((s, f) => s + (formats[f].catches || 0), 0),
                stats_updated_at: new Date().toISOString(),
            };

            const { data: existing } = await supabase
                .from('players')
                .select('id')
                .eq('howstat_id', parseInt(id))
                .maybeSingle();

            if (existing) {
                await supabase.from('players').update(payload).eq('howstat_id', parseInt(id));
            } else {
                await supabase.from('players').insert({ ...payload, team: 'Unknown', country: 'Unknown', position: 'Unknown' });
            }

            // Save format stats
            for (const [format, stats] of Object.entries(formats)) {
                await supabase.from('player_stats').upsert({
                    howstat_id: parseInt(id),
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
            }

            console.log(`  ✅ Saved to Supabase`);
        } catch (err) {
            console.log(`  ❌ Supabase error: ${err.message}`);
        }

        await sleep(1500);
    }

    console.log('\n[test] Done! Check Supabase to verify data.');
}

main().catch(console.error);