// backend/runFullScrape.js
require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DELAY_MS = 2500;  // polite delay between players
const FORMAT_DELAY_MS = 1500;  // delay between format pages per player
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000;
const TRADEABLE_MIN_INTL = 10;
const LOG_FILE = 'scrape_output.json';

const http = axios.create({
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const FORMAT_URLS = {
    TEST: (id) => `https://www.howstat.com/Cricket/Statistics/Players/PlayerOverview.asp?PlayerID=${id}`,
    ODI: (id) => `https://www.howstat.com/Cricket/Statistics/Players/PlayerOverview_ODI.asp?PlayerID=${id}`,
    T20I: (id) => `https://www.howstat.com/Cricket/Statistics/Players/PlayerOverview_T20.asp?PlayerID=${id}`,
    IPL: (id) => `https://www.howstat.com/Cricket/Statistics/IPL/PlayerOverview.asp?PlayerID=${id}`,
};

// ── Retry wrapper ─────────────────────────────────────────────────────────────
async function fetchWithRetry(url) {
    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
        try {
            const res = await http.get(url);
            return res;
        } catch (err) {
            if (attempt === RETRY_ATTEMPTS) throw err;
            console.log(`    ↻ retry ${attempt}/${RETRY_ATTEMPTS} after ${RETRY_DELAY_MS}ms...`);
            await sleep(RETRY_DELAY_MS);
        }
    }
}

// ── Fetch all player IDs from HowStat ────────────────────────────────────────
async function fetchAllPlayerIds() {
    console.log('[scrape] Fetching HowStat player list...');
    const res = await fetchWithRetry('https://www.howstat.com/cricket/Statistics/Players/PlayerList.asp');
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
    console.log(`[scrape] Found ${players.length} players.\n`);
    return players;
}

// ── Parse a format page ───────────────────────────────────────────────────────
function parseFormatPage(html) {
    const $ = cheerio.load(html);
    const stats = {
        matches: 0, innings: 0, runs: 0, batting_avg: 0, strike_rate: 0,
        hundreds: 0, fifties: 0, highest_score: '-',
        wickets: 0, bowling_avg: 0, economy: 0, best_bowling: '-', catches: 0,
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

// ── Form score + price ────────────────────────────────────────────────────────
function calculateFormScore(formats) {
    const intl = ['TEST', 'ODI', 'T20I'].filter(f => formats[f]);
    if (intl.length === 0) return 30;

    let score = 0;
    const bestAvg = Math.max(...intl.map(f => formats[f].batting_avg || 0));
    const bestSR = Math.max(...intl.map(f => formats[f].strike_rate || 0));
    score += (Math.min(bestAvg, 60) / 60) * 35;
    score += (Math.min(bestSR, 150) / 150) * 15;

    const totalHundreds = intl.reduce((s, f) => s + (formats[f].hundreds || 0), 0);
    score += Math.min(totalHundreds * 1.5, 15);

    const totalWickets = intl.reduce((s, f) => s + (formats[f].wickets || 0), 0);
    score += Math.min(totalWickets * 0.3, 15);

    const econValues = intl.map(f => formats[f].economy || 0).filter(e => e > 0);
    if (econValues.length > 0) {
        score += Math.max(0, (10 - Math.min(...econValues)) / 10) * 10;
    }

    return Math.min(Math.round(score), 100);
}

function calculatePrice(formScore) {
    return Math.round(500 + (formScore / 100) * 2000);
}

// ── Save to Supabase ──────────────────────────────────────────────────────────
async function saveToSupabase(id, name, formats, totalIntlMatches, formScore, price) {
    const intl = ['TEST', 'ODI', 'T20I'].filter(f => formats[f]);

    const payload = {
        howstat_id: parseInt(id),
        name,
        sport: 'cricket',
        team: 'Unknown',
        country: 'Unknown',
        position: 'Unknown',
        is_tradeable: totalIntlMatches >= TRADEABLE_MIN_INTL,
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
        await supabase.from('players').insert(payload);
    }

    // Save per-format stats
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
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    const players = await fetchAllPlayerIds();
    const results = { success: [], failed: [], skipped: [] };
    const startTime = Date.now();

    for (let i = 0; i < players.length; i++) {
        const { id, name } = players[i];
        const progress = `[${i + 1}/${players.length}]`;
        process.stdout.write(`${progress} ${name} (${id}) ... `);

        try {
            const formats = {};
            let totalIntlMatches = 0;

            for (const [format, urlFn] of Object.entries(FORMAT_URLS)) {
                try {
                    const res = await fetchWithRetry(urlFn(id));
                    const stats = parseFormatPage(res.data);
                    if (stats && stats.matches > 0) {
                        formats[format] = stats;
                        if (['TEST', 'ODI', 'T20I'].includes(format)) {
                            totalIntlMatches += stats.matches;
                        }
                    }
                } catch (err) {
                    // format failed — log but continue
                }
                await sleep(FORMAT_DELAY_MS);
            }

            if (Object.keys(formats).length === 0) {
                console.log('⊘ no stats found');
                results.skipped.push({ id, name });
            } else {
                const formScore = calculateFormScore(formats);
                const price = calculatePrice(formScore);

                await saveToSupabase(id, name, formats, totalIntlMatches, formScore, price);

                const fmts = Object.keys(formats).join(',');
                console.log(`✓ intl=${totalIntlMatches} tradeable=${totalIntlMatches >= TRADEABLE_MIN_INTL} form=${formScore} [${fmts}]`);
                results.success.push({ id, name, totalIntlMatches, formScore, formats: fmts });
            }

        } catch (err) {
            console.log(`✗ ${err.message}`);
            results.failed.push({ id, name, error: err.message });
        }

        // Save progress log every 50 players
        if ((i + 1) % 50 === 0) {
            fs.writeFileSync(LOG_FILE, JSON.stringify(results, null, 2));
            const elapsed = Math.round((Date.now() - startTime) / 60000);
            console.log(`\n--- Progress saved. ${i + 1}/${players.length} done in ${elapsed} min ---\n`);
        }

        await sleep(DELAY_MS);
    }

    // Final save
    fs.writeFileSync(LOG_FILE, JSON.stringify(results, null, 2));

    console.log('\n══════════════════════════════════');
    console.log(`✓ Success : ${results.success.length}`);
    console.log(`✗ Failed  : ${results.failed.length}`);
    console.log(`⊘ Skipped : ${results.skipped.length}`);
    console.log(`Log saved : ${LOG_FILE}`);
    console.log('══════════════════════════════════');
}

main().catch(console.error);