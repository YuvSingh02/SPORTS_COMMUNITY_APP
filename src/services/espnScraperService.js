const axios = require('axios');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const http = axios.create({
    timeout: 30000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
});

// ─────────────────────────────────────────────────────────────────
// HowStat player map — espn_id → { id, page }
// page: 'ipl'   → https://howstat.com/Cricket/Statistics/IPL/PlayerOverview.asp?PlayerID=X
// page: 'odi'   → https://howstat.com/Cricket/Statistics/Players/PlayerOverview_ODI.asp?PlayerID=X
// Same numeric ID works for both IPL and international pages
// ─────────────────────────────────────────────────────────────────
const PLAYER_MAP = {
    253802: { id: 3600, page: 'ipl' },   // Virat Kohli
    625371: { id: 3474, page: 'ipl' },   // Rohit Sharma
    481896: { id: 4399, page: 'ipl' },   // Hardik Pandya
    931581: { id: 4542, page: 'ipl' },   // Rishabh Pant
    422108: { id: 4137, page: 'ipl' },   // KL Rahul
    604527: { id: 3644, page: 'ipl' },   // Ravindra Jadeja
    475281: { id: 3788, page: 'ipl' },   // R Ashwin
    1070173: { id: 4073, page: 'ipl' },   // Suryakumar Yadav
    481979: { id: 4929, page: 'ipl' },   // Anrich Nortje
    4565: { id: 3637, page: 'ipl' },   // David Warner
    389095: { id: 5924, page: 'ipl' },   // Devon Conway
    308967: { id: 3888, page: 'ipl' },   // Jos Buttler
    44828: { id: 4339, page: 'ipl' },   // Kagiso Rabada
    21009: { id: 3817, page: 'ipl' },   // Kane Williamson
    8917: { id: 3830, page: 'ipl' },   // Mitchell Starc
    554691: { id: 4271, page: 'ipl' },   // Moeen Ali
    311911: { id: 4484, page: 'ipl' },   // Rashid Khan
    56143: { id: 3426, page: 'ipl' },   // Shakib Al Hasan
    5234: { id: 3756, page: 'ipl' },   // Steve Smith
    625383: { id: 4062, page: 'ipl' },   // Mohammed Shami (espn_id in DB)
    303669: { id: 3741, page: 'odi' },   // Joe Root (no IPL)
    324022: { id: 5771, page: 'odi' },   // Haris Rauf (no IPL)
    559235: { id: 4654, page: 'odi' },   // Fakhar Zaman (no IPL)
    49636: { id: 3871, page: 'odi' },   // Dimuth Karunaratne (no IPL)
    430246: { id: 4830, page: 'odi' },   // Dushmantha Chameera (no IPL)
    56009: { id: 3279, page: 'odi' },   // Mushfiqur Rahim (no IPL)
    297522: { id: 5951, page: 'odi' },   // Pathum Nissanka (no IPL)
    398778: { id: 3956, page: 'odi' },   // Stuart Broad (retired, no IPL)
};

function buildUrl(entry) {
    if (entry.page === 'ipl') {
        return `https://www.howstat.com/Cricket/Statistics/IPL/PlayerOverview.asp?PlayerID=${entry.id}`;
    }
    return `https://www.howstat.com/Cricket/Statistics/Players/PlayerOverview_ODI.asp?PlayerID=${entry.id}`;
}

// ─────────────────────────────────────────────────────────────────
// Parse stats table — works for both IPL and ODI HowStat pages.
// Scans all tables for one containing 'Batting' section header,
// so we're not brittle against table index shifts.
// ─────────────────────────────────────────────────────────────────
function parseStatsFromPage($) {
    const stats = {};
    let foundStatsTable = false;

    $('table').each((_, table) => {
        let section = '';
        let hasBatting = false;

        $(table).find('tr').each((_, row) => {
            const cells = $(row).find('td').map((__, td) => $(td).text().trim()).get();

            if (cells.length === 1) {
                const heading = cells[0].toLowerCase();
                if (heading === 'batting') { section = 'batting'; hasBatting = true; }
                if (heading === 'bowling') { section = 'bowling'; }
                if (heading === 'fielding') { section = 'fielding'; }
                return;
            }

            if (cells.length >= 2) {
                const label = cells[0].replace(':', '').trim().toLowerCase();
                const value = cells[1].trim();

                if (section === 'batting') {
                    if (label === 'aggregate') stats.runs = parseFloat(value) || 0;
                    if (label === 'average') stats.batting_avg = parseFloat(value) || 0;
                    if (label === 'scoring rate') stats.strike_rate = parseFloat(value) || 0;
                    if (label === '100s') stats.hundreds = parseInt(value) || 0;
                    if (label === '50s') stats.fifties = parseInt(value) || 0;
                    if (label === 'highest score') stats.highest_score = value;
                }

                if (section === 'bowling') {
                    if (label === 'wickets') stats.wickets = parseInt(value) || 0;
                    if (label === 'average') stats.bowling_avg = parseFloat(value) || 0;
                    if (label === 'economy rate') stats.economy = parseFloat(value) || 0;
                    if (label === 'best') stats.best_bowling = value;
                }
            }
        });

        if (hasBatting) foundStatsTable = true;
    });

    return foundStatsTable ? stats : null;
}

// ─────────────────────────────────────────────────────────────────
// Scrape one player
// ─────────────────────────────────────────────────────────────────
async function scrapePlayerStats(espnId, entry) {
    const url = buildUrl(entry);
    try {
        const res = await http.get(url);
        const $ = cheerio.load(res.data);
        const stats = parseStatsFromPage($);

        if (!stats) {
            console.warn(`[scraper] No stats table found — espn_id=${espnId} url=${url}`);
            return null;
        }
        return stats;
    } catch (err) {
        console.error(`[scraper] Fetch failed — espn_id=${espnId}: ${err.message}`);
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────
// Form score (0–100) and price calculation
// ─────────────────────────────────────────────────────────────────
function calculateFormScore(stats) {
    let score = 0;

    const avg = Math.min(stats.batting_avg || 0, 60);
    score += (avg / 60) * 30;

    const sr = Math.min(stats.strike_rate || 0, 200);
    score += (sr / 200) * 15;

    score += Math.min((stats.hundreds || 0) * 2, 10);
    score += Math.min((stats.fifties || 0) * 0.5, 5);

    score += Math.min((stats.wickets || 0) * 0.5, 15);

    const economy = stats.economy || 0;
    if (economy > 0 && economy < 12) score += ((12 - economy) / 12) * 10;

    const bowlAvg = stats.bowling_avg || 0;
    if (bowlAvg > 0 && bowlAvg < 50) score += ((50 - bowlAvg) / 50) * 15;

    return Math.min(Math.round(score), 100);
}

function calculatePrice(basePrice, formScore) {
    const multiplier = 0.5 + (formScore / 100) * 1.5;
    return Math.round(basePrice * multiplier);
}

// ─────────────────────────────────────────────────────────────────
// Upsert one player into Supabase
// ─────────────────────────────────────────────────────────────────
async function upsertPlayerStats(espnId, stats, formScore, currentPrice) {
    const { error } = await supabase
        .from('players')
        .update({
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
            form_score: formScore,
            current_price: currentPrice,
            last_scraped_at: new Date().toISOString(),
        })
        .eq('espn_id', espnId);

    if (error) {
        console.error(`[supabase] Update failed espn_id=${espnId}:`, error.message);
    } else {
        console.log(`[supabase] ✓ espn_id=${espnId} | form=${formScore} | price=${currentPrice}`);
    }
}

// ─────────────────────────────────────────────────────────────────
// Main — scrape all mapped players
// ─────────────────────────────────────────────────────────────────
async function scrapeAllPlayers() {
    console.log('[scraper] Starting HowStat scrape...');

    const { data: players, error } = await supabase
        .from('players')
        .select('espn_id, base_price')
        .not('espn_id', 'is', null);

    if (error) {
        console.error('[scraper] Failed to fetch players from Supabase:', error.message);
        return;
    }

    // Deduplicate by espn_id (DB has some duplicates with null espn_id rows)
    const seen = new Set();
    const unique = players.filter(p => {
        if (seen.has(p.espn_id)) return false;
        seen.add(p.espn_id);
        return true;
    });

    let success = 0, skipped = 0, failed = 0;

    for (const player of unique) {
        const entry = PLAYER_MAP[player.espn_id];
        if (!entry) {
            console.warn(`[scraper] No HowStat mapping for espn_id=${player.espn_id} — skipping`);
            skipped++;
            continue;
        }

        const stats = await scrapePlayerStats(player.espn_id, entry);
        if (!stats) { failed++; continue; }

        const formScore = calculateFormScore(stats);
        const currentPrice = calculatePrice(player.base_price || 1000, formScore);

        await upsertPlayerStats(player.espn_id, stats, formScore, currentPrice);
        success++;

        await new Promise(r => setTimeout(r, 1500)); // polite delay
    }

    console.log(`[scraper] Done — ✓ ${success} updated | ⚠ ${skipped} skipped | ✗ ${failed} failed`);
}

// Alias kept so playerStatsSync.js needs no changes
async function scrapeAllTeams() {
    return scrapeAllPlayers();
}

module.exports = { scrapeAllTeams, scrapeAllPlayers };