// frontend/src/services/leaderboardService.js
//
// Handles all leaderboard API calls.
// Follows the same pattern as coinsService.js — named exports, no default export.

import api from './api';

/**
 * Fetch leaderboard entries for the given scope in the active season.
 *
 * @param {'national' | 'state' | 'city'} scope
 * @returns {Promise<{
 *   entries: Array<{
 *     user_id: string,
 *     name: string,
 *     city: string,
 *     state: string,
 *     growth_percent: number,
 *     portfolio_value: number,
 *     trade_count: number,
 *     rank: number,
 *   }>,
 *   userEntry: { national_rank: number, state_rank: number, city_rank: number } | null,
 * }>}
 */
export const fetchLeaderboard = (scope = 'national') =>
  api.get(`/leaderboard?scope=${scope}`);