const axios = require('axios');
const cheerio = require('cheerio');

axios.get('https://www.howstat.com/cricket/Statistics/Players/PlayerList.asp', {
    headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0' },
    timeout: 30000
}).then(r => {
    const $ = cheerio.load(r.data);
    let i = 0;
    $('a[href*="PlayerOverviewSummary"]').each((_, el) => {
        if (i++ > 10) return;
        const row = $(el).closest('tr');
        const cells = row.find('td').map((__, td) => $(td).text().trim()).get();
        console.log('CELLS:', JSON.stringify(cells));
    });
}).catch(e => console.error(e.message));