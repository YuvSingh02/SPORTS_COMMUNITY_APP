// backend/src/controllers/playersController.js

require('dotenv').config();
const { getPlayers } = require('../services/cricketApiService');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── GET ALL PLAYERS ─────────────────────────────────────────────────────────
const getAllPlayers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('current_price', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      const players = await getPlayers();
      const { data: seeded, error: seedError } = await supabase
        .from('players')
        .insert(players)
        .select();
      if (seedError) throw seedError;
      return res.json({ success: true, count: seeded.length, players: seeded });
    }

    return res.json({ success: true, count: data.length, players: data });

  } catch (err) {
    console.error('[getAllPlayers] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch players' });
  }
};

// ─── GET PLAYERS BY TEAM ─────────────────────────────────────────────────────
const getPlayersByTeam = async (req, res) => {
  try {
    const { team } = req.params;
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .ilike('team', team)
      .order('current_price', { ascending: false });

    if (error) throw error;
    return res.json({ success: true, count: data.length, players: data });

  } catch (err) {
    console.error('[getPlayersByTeam] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch players by team' });
  }
};

// ─── GET SINGLE PLAYER ───────────────────────────────────────────────────────
const getPlayerById = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch player base data
    const { data: player, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!player) return res.status(404).json({ success: false, message: 'Player not found' });

    // Fetch all format stats for this player
    let formatStats = {};
    if (player.howstat_id) {
      const { data: stats } = await supabase
        .from('player_stats')
        .select('*')
        .eq('howstat_id', player.howstat_id);

      if (stats && stats.length > 0) {
        // Key by format: { TEST: {...}, ODI: {...}, T20I: {...}, IPL: {...} }
        stats.forEach(s => { formatStats[s.format] = s; });
      }
    }

    // Merge everything into one response object
    return res.json({
      success: true,
      player: {
        ...player,
        format_stats: formatStats,
      }
    });

  } catch (err) {
    console.error('[getPlayerById] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch player' });
  }
};

module.exports = { getAllPlayers, getPlayersByTeam, getPlayerById };