// backend/src/services/footballApiService.js
// Wraps football-data.org v4 (free tier)

const axios  = require('axios');
const config = require('../config/env');
const logger = require('../utils/logger');

const footballClient = axios.create({
  baseURL: config.footballApi.baseUrl,
  timeout: 15_000,
  headers: { 'X-Auth-Token': config.footballApi.key },
});

// ── Normalise player stats ────────────────────────────────────────────────
const normalisePlayerStats = (apiPlayer) => ({
  external_player_id: String(apiPlayer.player.id),
  raw_stats: {
    goals:          apiPlayer.statistics?.[0]?.goals?.scored       ?? 0,
    assists:        apiPlayer.statistics?.[0]?.goals?.assists       ?? 0,
    clean_sheet:    apiPlayer.statistics?.[0]?.goals?.conceded === 0 ? 1 : 0,
    saves:          apiPlayer.statistics?.[0]?.goals?.saves        ?? 0,
    tackles:        apiPlayer.statistics?.[0]?.tackles?.total      ?? 0,
    pass_accuracy:  apiPlayer.statistics?.[0]?.passes?.accuracy    ?? 0,
    yellow_card:    apiPlayer.statistics?.[0]?.cards?.yellow       ?? 0,
    red_card:       apiPlayer.statistics?.[0]?.cards?.red          ?? 0,
    own_goal:       apiPlayer.statistics?.[0]?.goals?.ownGoals     ?? 0,
    minutes_played: apiPlayer.statistics?.[0]?.games?.minutesPlayed ?? 0,
  },
});

/**
 * Fetch recent completed matches (last N days).
 */
const fetchRecentMatches = async ({ competitions = 'PL,PD,SA,BL1,FL1', limit = 10 } = {}) => {
  try {
    const { data } = await footballClient.get('/matches', {
      params: {
        competitions,
        status: 'FINISHED',
        limit,
      },
    });

    return (data.matches ?? []).map((m) => ({
      external_id: String(m.id),
      sport:       'football',
      team1:       m.homeTeam.name,
      team2:       m.awayTeam.name,
      tournament:  m.competition?.name,
      venue:       null,
      match_date:  m.utcDate,
      status:      mapMatchStatus(m.status),
      result:      m.score
        ? `${m.homeTeam.shortName} ${m.score.fullTime.home}–${m.score.fullTime.away} ${m.awayTeam.shortName}`
        : null,
    }));
  } catch (err) {
    logger.error('[FootballAPI] fetchRecentMatches failed:', err.message);
    throw err;
  }
};

/**
 * Fetch players for a specific team.
 */
const fetchTeamPlayers = async (teamId) => {
  try {
    const { data } = await footballClient.get(`/teams/${teamId}`);

    return (data.squad ?? []).map((p) => ({
      external_id: String(p.id),
      name:        p.name,
      sport:       'football',
      team:        data.name,
      country:     p.nationality ?? 'Unknown',
      position:    p.position ?? null,
      image_url:   null,   // free tier doesn't include photos
    }));
  } catch (err) {
    logger.error(`[FootballAPI] fetchTeamPlayers(${teamId}) failed:`, err.message);
    throw err;
  }
};

const mapMatchStatus = (status) => {
  const map = {
    SCHEDULED:  'scheduled',
    TIMED:      'scheduled',
    IN_PLAY:    'live',
    PAUSED:     'live',
    FINISHED:   'completed',
    SUSPENDED:  'cancelled',
    POSTPONED:  'cancelled',
    CANCELLED:  'cancelled',
  };
  return map[status] ?? 'scheduled';
};

module.exports = {
  fetchRecentMatches,
  fetchTeamPlayers,
};
