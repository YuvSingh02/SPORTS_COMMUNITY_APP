const axios = require('axios');
const cheerio = require('cheerio');

const http = axios.create({
    timeout: 30000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
});

// HowStat.com — static ASP pages, no JS rendering, cheerio works
// Kohli's HowStat PlayerID = 3600
const URLS = {
    'ODI BATTING': `https://www.howstat.com/Cricket/Statistics/Players/PlayerOverview_ODI.asp?PlayerId=3600`,
    'T20 BATTING': `https://www.howstat.com/Cricket/Statistics/Players/PlayerOverview_T20.asp?PlayerID=3600`,
    'IPL BATTING': `https://www.howstat.com/Cricket/Statistics/IPL/PlayerOverview.asp?PlayerID=3600`,
};

async function debugUrl(label, url) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`=== ${label} ===`);
    console.log('='.repeat(60));

    try {
        const res = await http.get(url);
        console.log(`HTTP STATUS: ${res.status}`);
        const $ = cheerio.load(res.data);

        console.log('\n--- ALL TABLES ---');
        $('table').each((i, el) => {
            console.log(`Table ${i}: class="${$(el).attr('class')}" rows=${$(el).find('tr').length}`);
        });

        console.log('\n--- TABLE ROWS WITH CONTENT ---');
        $('table').each((i, table) => {
            const rows = [];
            $(table).find('tr').each((j, row) => {
                const cells = $(row).find('td,th').map((_, td) => $(td).text().trim()).get();
                if (cells.some(c => c.length > 0)) rows.push({ row: j, cells });
            });
            if (rows.length > 0) {
                console.log(`\n[Table ${i}]`);
                rows.forEach(r => console.log(`  Row ${r.row}:`, r.cells));
            }
        });

    } catch (err) {
        console.log(`ERROR: ${err.message} | status: ${err.response?.status}`);
    }
}

async function debug() {
    for (const [label, url] of Object.entries(URLS)) {
        await debugUrl(label, url);
        await new Promise(r => setTimeout(r, 1000));
    }
}

debug().catch(console.error);