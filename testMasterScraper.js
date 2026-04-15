// backend/testMasterScraper.js
require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

const http = axios.create({
    timeout: 30000,
    headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0' },
});
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const TEST_PLAYERS = [
    { id: '3600', name: 'Virat Kohli' },
    { id: '3474', name: 'Rohit Sharma' },
    { id: '3984', name: 'MS Dhoni' },
];

const FORMAT_URLS = {
    TEST: (id) => `https://www.howstat.com/Cricket/Statistics/Players/PlayerOverview.asp?PlayerID=${id}`,
    ODI: (id) => `https://www.howstat.com/Cricket/Statistics/Players/PlayerOverview_ODI.asp?PlayerID=${id}`,
    T20I: (id) => `https://www.howstat.com/Cricket/Statistics/Players/PlayerOverview_T20.asp?PlayerID=${id}`,
    IPL: (id) => `https://www.howstat.com/Cricket/Statistics/IPL/PlayerOverview.asp?PlayerID=${id}`,
};

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

        // Detect section switches
        if (label === 'balls' || label === 'maidens' || label === 'runs conceded' || label === 'wickets') {
            section = 'bowling';
        }
        if (label === 'catches') {
            section = 'fielding';
        }

        if (section === 'batting') {
            // "Matches:" → "123 (2011-)" — extract just the number
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
            // bowling average — skip if N/A
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

async function testPlayer(id, name) {
    console.log(`\n══════ ${name} (ID=${id}) ══════`);

    for (const [format, urlFn] of Object.entries(FORMAT_URLS)) {
        try {
            const res = await http.get(urlFn(id));
            const stats = parseFormatPage(res.data);
            if (!stats) {
                console.log(`  ${format}: no stats found`);
            } else {
                console.log(`  ${format}: matches=${stats.matches} runs=${stats.runs} avg=${stats.batting_avg} 100s=${stats.hundreds} wickets=${stats.wickets} economy=${stats.economy} catches=${stats.catches}`);
            }
        } catch (err) {
            console.log(`  ${format}: ERROR — ${err.message}`);
        }
        await sleep(500);
    }
}

async function main() {
    for (const { id, name } of TEST_PLAYERS) {
        await testPlayer(id, name);
        await sleep(1500);
    }
}

main().catch(console.error);