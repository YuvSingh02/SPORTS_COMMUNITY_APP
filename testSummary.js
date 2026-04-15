require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

axios.get('https://www.howstat.com/cricket/Statistics/Players/PlayerOverviewSummary.asp?PlayerID=3600', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' }
}).then(r => {
    const $ = cheerio.load(r.data);
    $('table').each((i, table) => {
        const rows = [];
        $(table).find('tr').each((j, row) => {
            const cells = $(row).find('td,th').map((k, td) => $(td).text().trim()).get();
            if (cells.length > 0) rows.push(cells);
        });
        if (rows.length > 0) {
            console.log(`\n--- Table ${i} ---`);
            rows.forEach(r => console.log(r));
        }
    });
}).catch(e => console.error(e.message));
