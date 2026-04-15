require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
    console.log('[fix] Fetching HowStat player list...');

    const res = await axios.get('https://www.howstat.com/cricket/Statistics/Players/PlayerList.asp', {
        headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0' },
        timeout: 30000,
    });

    const $ = cheerio.load(res.data);

    // Build map: howstat_id → { name, country }
    const playerMap = {};
    $('a[href*="PlayerOverviewSummary"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const match = href.match(/PlayerID=(\d+)/i);
        const row = $(el).closest('tr');
        const cells = row.find('td').map((__, td) => $(td).text().trim()).get();
        const name = cells[0] || '';
        const country = cells[2] || '';

        if (match && country) {
            playerMap[parseInt(match[1])] = { name, country };
        }
    });

    console.log(`[fix] Found ${Object.keys(playerMap).length} players with country data`);

    // Batch update Supabase
    let updated = 0;
    let failed = 0;

    for (const [howstatId, info] of Object.entries(playerMap)) {
        const { error } = await supabase
            .from('players')
            .update({ country: info.country })
            .eq('howstat_id', parseInt(howstatId));

        if (error) {
            console.error(`[fix] Failed howstat_id=${howstatId}: ${error.message}`);
            failed++;
        } else {
            updated++;
        }
    }

    console.log(`[fix] Done — ${updated} updated, ${failed} failed`);

    // Verify
    const { data: sample } = await supabase
        .from('players')
        .select('name, country, howstat_id')
        .not('howstat_id', 'is', null)
        .limit(10);

    console.log('\n[verify] Sample after update:');
    sample.forEach(p => console.log(` ${p.name} → ${p.country}`));
}

main().catch(console.error);