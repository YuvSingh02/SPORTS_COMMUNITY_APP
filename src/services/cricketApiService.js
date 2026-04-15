// backend/src/services/cricketApiService.js

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const API_KEY  = process.env.CRICKET_API_KEY;
const BASE_URL = process.env.CRICKET_API_BASE_URL || 'https://api.cricketdata.org/api/v1';

// ── API caller ────────────────────────────────────────────────────────────────

const callApi = async (endpoint) => {
  const url = `${BASE_URL}${endpoint}&apikey=${API_KEY}`;
  const res  = await fetch(url);
  const json = await res.json();
  if (json.status !== 'success') throw new Error(json.reason || 'API error');
  return json.data;
};

// ── Search player by name → get their API id ──────────────────────────────────

const searchPlayer = async (name) => {
  try {
    const data = await callApi(`/players?offset=0&search=${encodeURIComponent(name)}`);
    return Array.isArray(data) ? data[0] : null;
  } catch (err) {
    logger.warn(`[CricketAPI] Search failed for ${name}: ${err.message}`);
    return null;
  }
};

// ── Fetch player stats by API id ──────────────────────────────────────────────

const fetchPlayerStats = async (apiId) => {
  try {
    const data = await callApi(`/players/stats?id=${apiId}`);
    return data;
  } catch (err) {
    logger.warn(`[CricketAPI] Stats failed for ${apiId}: ${err.message}`);
    return null;
  }
};

// ── Parse stats into our format ───────────────────────────────────────────────

const parseStats = (raw) => {
  if (!raw) return null;

  const batting  = raw.stats?.find(s => s.fn === 'batting')  || {};
  const bowling  = raw.stats?.find(s => s.fn === 'bowling')  || {};
  const t20bat   = batting?.values?.find(v => v.matchtype === 't20i') || {};
  const odibat   = batting?.values?.find(v => v.matchtype === 'odi')  || {};
  const testbat  = batting?.values?.find(v => v.matchtype === 'test') || {};
  const t20bowl  = bowling?.values?.find(v => v.matchtype === 't20i') || {};
  const odibowl  = bowling?.values?.find(v => v.matchtype === 'odi')  || {};

  return {
    // Batting
    bat_matches:     parseInt(odibat.matches  || testbat.matches || 0),
    bat_runs:        parseInt(odibat.runs     || testbat.runs    || 0),
    bat_average:     parseFloat(odibat.avg    || testbat.avg     || 0).toFixed(1),
    bat_strike_rate: parseFloat(t20bat.sr     || odibat.sr       || 0).toFixed(1),
    bat_hundreds:    parseInt(odibat['100s']  || testbat['100s'] || 0),
    bat_fifties:     parseInt(odibat['50s']   || testbat['50s']  || 0),
    bat_highest:     odibat.hs || testbat.hs || '—',

    // Bowling
    bowl_wickets:    parseInt(odibowl.wickets || t20bowl.wickets || 0),
    bowl_economy:    parseFloat(t20bowl.eco   || odibowl.eco     || 0).toFixed(1),
    bowl_average:    parseFloat(odibowl.avg   || t20bowl.avg     || 0).toFixed(1),
    bowl_best:       odibowl.best || t20bowl.best || '—',

    // Meta
    role:            raw.role  || null,
    country:         raw.country || null,
    date_of_birth:   raw.dateOfBirth || null,
    batting_style:   raw.battingStyle || null,
    bowling_style:   raw.bowlingStyle || null,
    stats_updated_at: new Date().toISOString(),
  };
};

// ── Main: refresh stats for one player ───────────────────────────────────────

const refreshPlayerStats = async (player) => {
  logger.info(`[CricketAPI] Refreshing stats for ${player.name}`);

  // 1. Search player to get API id
  const found = await searchPlayer(player.name);
  if (!found?.id) {
    logger.warn(`[CricketAPI] Player not found: ${player.name}`);
    return false;
  }

  // 2. Fetch stats
  const raw   = await fetchPlayerStats(found.id);
  const stats = parseStats(raw);
  if (!stats) return false;

  // 3. Save to Supabase
  const { error } = await supabase
    .from('players')
    .update({
      api_player_id:    found.id,
      role:             stats.role             || player.role,
      batting_style:    stats.batting_style,
      bowling_style:    stats.bowling_style,
      bat_matches:      stats.bat_matches,
      bat_runs:         stats.bat_runs,
      bat_average:      stats.bat_average,
      bat_strike_rate:  stats.bat_strike_rate,
      bat_hundreds:     stats.bat_hundreds,
      bat_fifties:      stats.bat_fifties,
      bat_highest:      stats.bat_highest,
      bowl_wickets:     stats.bowl_wickets,
      bowl_economy:     stats.bowl_economy,
      bowl_average:     stats.bowl_average,
      bowl_best:        stats.bowl_best,
      stats_updated_at: stats.stats_updated_at,
    })
    .eq('id', player.id);

  if (error) {
    logger.error(`[CricketAPI] Supabase update failed for ${player.name}:`, error);
    return false;
  }

  logger.info(`[CricketAPI] ✅ Updated ${player.name}`);
  return true;
};

// ── Daily job: refresh all players (runs at midnight) ────────────────────────
// Batches to stay within 100 hits/day limit

const refreshAllPlayers = async () => {
  logger.info('[CricketAPI] Starting daily stats refresh...');

  const { data: players, error } = await supabase
    .from('players')
    .select('id, name, role')
    .eq('sport', 'cricket')
    .order('form_score', { ascending: false })
    .limit(45); // stay safe under 100/day (2 API calls per player)

  if (error) {
    logger.error('[CricketAPI] Failed to fetch players:', error);
    return;
  }

  let success = 0;
  for (const player of players) {
    const ok = await refreshPlayerStats(player);
    if (ok) success++;
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  logger.info(`[CricketAPI] Daily refresh done. ${success}/${players.length} updated.`);
};

// ── Mock data fallback (used on first seed) ───────────────────────────────────

const MOCK_PLAYERS = [
  { id: 'ind1',  name: 'Virat Kohli',        sport: 'cricket', team: 'India',        country: 'India',        current_price: 1500, form_score: 92 },
  { id: 'ind2',  name: 'Rohit Sharma',        sport: 'cricket', team: 'India',        country: 'India',        current_price: 1380, form_score: 85 },
  { id: 'ind3',  name: 'Jasprit Bumrah',      sport: 'cricket', team: 'India',        country: 'India',        current_price: 1200, form_score: 90 },
  { id: 'ind4',  name: 'Hardik Pandya',       sport: 'cricket', team: 'India',        country: 'India',        current_price: 1050, form_score: 82 },
  { id: 'ind5',  name: 'KL Rahul',            sport: 'cricket', team: 'India',        country: 'India',        current_price: 980,  form_score: 78 },
  { id: 'ind6',  name: 'Shubman Gill',        sport: 'cricket', team: 'India',        country: 'India',        current_price: 870,  form_score: 80 },
  { id: 'ind7',  name: 'Ravindra Jadeja',     sport: 'cricket', team: 'India',        country: 'India',        current_price: 950,  form_score: 77 },
  { id: 'ind8',  name: 'Suryakumar Yadav',    sport: 'cricket', team: 'India',        country: 'India',        current_price: 1020, form_score: 86 },
  { id: 'ind9',  name: 'Rishabh Pant',        sport: 'cricket', team: 'India',        country: 'India',        current_price: 1100, form_score: 84 },
  { id: 'ind10', name: 'Axar Patel',          sport: 'cricket', team: 'India',        country: 'India',        current_price: 780,  form_score: 75 },
  { id: 'ind11', name: 'Mohammed Siraj',      sport: 'cricket', team: 'India',        country: 'India',        current_price: 820,  form_score: 79 },
  { id: 'ind12', name: 'Yashasvi Jaiswal',    sport: 'cricket', team: 'India',        country: 'India',        current_price: 900,  form_score: 83 },
  { id: 'ind13', name: 'Arshdeep Singh',      sport: 'cricket', team: 'India',        country: 'India',        current_price: 760,  form_score: 76 },
  { id: 'ind14', name: 'Kuldeep Yadav',       sport: 'cricket', team: 'India',        country: 'India',        current_price: 810,  form_score: 78 },
  { id: 'ind15', name: 'Shreyas Iyer',        sport: 'cricket', team: 'India',        country: 'India',        current_price: 850,  form_score: 77 },
  { id: 'eng1',  name: 'Ben Stokes',          sport: 'cricket', team: 'England',      country: 'England',      current_price: 1300, form_score: 87 },
  { id: 'eng2',  name: 'Jos Buttler',         sport: 'cricket', team: 'England',      country: 'England',      current_price: 990,  form_score: 79 },
  { id: 'eng3',  name: 'Joe Root',            sport: 'cricket', team: 'England',      country: 'England',      current_price: 1250, form_score: 88 },
  { id: 'eng4',  name: 'Jofra Archer',        sport: 'cricket', team: 'England',      country: 'England',      current_price: 1050, form_score: 83 },
  { id: 'eng5',  name: 'Harry Brook',         sport: 'cricket', team: 'England',      country: 'England',      current_price: 980,  form_score: 82 },
  { id: 'aus1',  name: 'Pat Cummins',         sport: 'cricket', team: 'Australia',    country: 'Australia',    current_price: 1150, form_score: 89 },
  { id: 'aus2',  name: 'Steve Smith',         sport: 'cricket', team: 'Australia',    country: 'Australia',    current_price: 1050, form_score: 81 },
  { id: 'aus3',  name: 'David Warner',        sport: 'cricket', team: 'Australia',    country: 'Australia',    current_price: 1000, form_score: 80 },
  { id: 'aus4',  name: 'Mitchell Starc',      sport: 'cricket', team: 'Australia',    country: 'Australia',    current_price: 1080, form_score: 85 },
  { id: 'aus6',  name: 'Travis Head',         sport: 'cricket', team: 'Australia',    country: 'Australia',    current_price: 980,  form_score: 84 },
  { id: 'nz1',   name: 'Kane Williamson',     sport: 'cricket', team: 'New Zealand',  country: 'New Zealand',  current_price: 1200, form_score: 87 },
  { id: 'nz2',   name: 'Trent Boult',         sport: 'cricket', team: 'New Zealand',  country: 'New Zealand',  current_price: 1000, form_score: 83 },
  { id: 'sa1',   name: 'Kagiso Rabada',       sport: 'cricket', team: 'South Africa', country: 'South Africa', current_price: 1150, form_score: 88 },
  { id: 'sa2',   name: 'Quinton de Kock',     sport: 'cricket', team: 'South Africa', country: 'South Africa', current_price: 1000, form_score: 82 },
  { id: 'pak1',  name: 'Babar Azam',          sport: 'cricket', team: 'Pakistan',     country: 'Pakistan',     current_price: 1200, form_score: 86 },
  { id: 'pak2',  name: 'Shaheen Afridi',      sport: 'cricket', team: 'Pakistan',     country: 'Pakistan',     current_price: 1100, form_score: 87 },
  { id: 'afg1',  name: 'Rashid Khan',         sport: 'cricket', team: 'Afghanistan',  country: 'Afghanistan',  current_price: 1200, form_score: 91 },
  { id: 'sl1',   name: 'Wanindu Hasaranga',   sport: 'cricket', team: 'Sri Lanka',    country: 'Sri Lanka',    current_price: 1050, form_score: 85 },
  { id: 'ban1',  name: 'Shakib Al Hasan',     sport: 'cricket', team: 'Bangladesh',   country: 'Bangladesh',   current_price: 1100, form_score: 85 },
];

const getPlayers = async () => {
  logger.info('[cricketApiService] Using mock data for initial seed');
  return MOCK_PLAYERS.map((p) => ({
    external_id:   p.id,
    name:          p.name,
    sport:         p.sport,
    team:          p.team,
    country:       p.country,
    current_price: p.current_price,
    base_price:    p.current_price,
    form_score:    p.form_score,
    position:      'ALL',
  }));
};

module.exports = { getPlayers, refreshAllPlayers, refreshPlayerStats };