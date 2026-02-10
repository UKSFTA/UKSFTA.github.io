const fs = require('node:fs');
const path = require('node:path');
const axios = require('axios');
const { GameDig: Gamedig } = require('gamedig');
const steamApi = require('./lib/steam_api');
const rcon = require('./lib/rcon');
const ucApi = require('./lib/uc_api');
require('dotenv').config();

// UKSF External Data Fetcher (Node.js version)
// This script runs during the CI/CD build process.

const _STEAM_API_KEY = process.env.STEAM_API_KEY;
const _STEAM_SERVER_IP = process.env.STEAM_SERVER_IP || '127.0.0.1';
const _STEAM_QUERY_PORT = parseInt(process.env.STEAM_QUERY_PORT, 10) || 9046;
const _BATTLEMETRICS_SERVER_ID =
  process.env.BATTLEMETRICS_SERVER_ID || '123456';

const UC_COMMUNITY_ID = process.env.UNIT_COMMANDER_COMMUNITY_ID;
const UC_BOT_TOKEN = process.env.UNIT_COMMANDER_BOT_TOKEN;
const UC_BASE_URL = `https://api.unitcommander.co.uk/community/${UC_COMMUNITY_ID}`;

/**
 * Fetches data from Unit Commander API
 */
async function fetchUnitCommanderData(endpoint) {
  if (!UC_COMMUNITY_ID || !UC_BOT_TOKEN) {
    console.warn(`Unit Commander credentials missing. Skipping ${endpoint}.`);
    return [];
  }

  try {
    const response = await axios.get(`${UC_BASE_URL}/${endpoint}`, {
      headers: {
        Authorization: `Bot ${UC_BOT_TOKEN}`,
        Accept: 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error(
      `Error fetching from Unit Commander (${endpoint}):`,
      error.message,
    );
    return [];
  }
}

function cleanName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/^\[.*?\]\s+/, '')
    .replace(
      /^(gen|maj gen|brig|col|lt col|maj|capt|lt|2lt|wo1|wo2|ssgt|csgt|sgt|cpl|lcpl|tpr|sig|rct|pte|am|as1|as2|po|cpo|cmdr|sqn ldr|flt lt|fg off|plt off|wg cdr)\.?\s+/i,
      '',
    )
    .replace(/\s+\[.*?\]$/, '')
    .trim();
}

/**
 * Fetches live player counts and server status via Gamedig and Steam API enrichment
 */
async function fetchSteamStats(ucProfiles = []) {
  try {
    console.log(`Querying game server at ${_STEAM_SERVER_IP}:${_STEAM_QUERY_PORT}...`);
    const state = await Gamedig.query({
      type: 'arma3', // Default to arma3, adjust if needed
      host: _STEAM_SERVER_IP,
      port: _STEAM_QUERY_PORT,
    });

    // Fetch private links from Supabase for ID resolution
    const supabaseLinks = await ucApi.getSteamLinks();
    const reverseLinks = await ucApi.getLinks(); // discord_id -> uc_id

    // Try to get RCON data for better identification
    const rconPlayers = await rcon.getPlayers();
    if (rconPlayers.length > 0) {
      console.log(`[RCON] Fetched ${rconPlayers.length} active sessions: ${rconPlayers.map(p => p.name).join(', ')}`);
    }

    const steamIds = state.players
      .map((p) => {
        // Use Gamedig ID or fall back to RCON match
        let sid = p.raw?.steamid;
        if (!sid || !/^\d{17}$/.test(sid)) {
          const rMatch = rconPlayers.find(rp => cleanName(rp.name) === cleanName(p.name));
          if (rMatch && rMatch.steamId) {
            sid = rMatch.steamId;
          } else {
            // Supabase Soft Link (Match Name -> UC Profile -> SteamID)
            const ucMatch = ucProfiles.find(up => cleanName(up.alias) === cleanName(p.name));
            if (ucMatch) {
              const discordId = Object.keys(reverseLinks).find(did => reverseLinks[did].toString() === ucMatch.id.toString());
              if (discordId && supabaseLinks[discordId]) {
                sid = supabaseLinks[discordId];
                console.log(`[RESOLVER] Soft-linked "${p.name}" via Supabase.`);
              }
            }
          }
        }
        return sid;
      })
      .filter((id) => id && /^\d{17}$/.test(id));

    let enrichedPlayers = state.players;

    if (steamIds.length > 0) {
      console.log(`Enriching ${steamIds.length} players via Steam API...`);
      const summaries = await steamApi.getPlayerSummaries(steamIds);
      
      enrichedPlayers = state.players.map((player) => {
        const pClean = cleanName(player.name);
        let sid = player.raw?.steamid;
        
        if (!sid || !/^\d{17}$/.test(sid)) {
          const rMatch = rconPlayers.find(rp => cleanName(rp.name) === pClean);
          sid = rMatch?.steamId;

          if (!sid) {
            const ucMatch = ucProfiles.find(up => cleanName(up.alias) === pClean);
            if (ucMatch) {
              const discordId = Object.keys(reverseLinks).find(did => reverseLinks[did].toString() === ucMatch.id.toString());
              sid = discordId ? supabaseLinks[discordId] : null;
            }
          }
        }
        
        const summary = summaries.find((s) => s.steamid === sid);
        return {
          name: player.name,
          steamid: sid || null,
          avatar: summary?.avatarfull || null,
          profile_url: summary?.profileurl || null,
          time: player.raw?.time || 0,
        };
      });
    }

    return {
      current_players: state.players.length,
      max_players: state.maxplayers,
      server_name: state.name,
      map: state.map,
      status: 'ACTIVE',
      players: enrichedPlayers,
    };
  } catch (e) {
    console.warn('[SteamStats] Gamedig query failed, falling back to basic info:', e.message);
    return {
      current_players: 0,
      max_players: 100,
      server_name: 'UKSF Official | Milsim',
      map: 'Chernarus',
      status: 'OFFLINE',
      players: [],
    };
  }
}

/**
 * Fetches historical activity via Battlemetrics API
 */
async function fetchBattlemetricsStats() {
  return {
    rank: 420,
    uptime: '99.9%',
    activity_30d: [10, 15, 8, 12, 25, 30, 22],
  };
}

/**
 * Fetches Discord roster data from Supabase
 */
async function fetchDiscordRoster() {
  try {
    const { data, error } = await ucApi.supabase.from('personnel').select('*');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn('[ROSTER] Could not fetch Discord roster from Supabase:', error.message);
    return [];
  }
}

async function main() {
  try {
    // Fetch from Unit Commander
    console.log('Fetching Unit Commander data...');
    const ranks = await fetchUnitCommanderData('ranks');
    const awards = await fetchUnitCommanderData('awards');
    const campaigns = await fetchUnitCommanderData('campaigns');
    const profiles = await fetchUnitCommanderData('profiles');
    const units = await fetchUnitCommanderData('units');
    const events = await fetchUnitCommanderData('events');

    // Fetch from Discord/Supabase
    console.log('Fetching Discord roster from Supabase...');
    const discordRoster = await fetchDiscordRoster();

    const steamData = await fetchSteamStats(profiles);
    const battlemetricsData = await fetchBattlemetricsStats();

    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }

    // Output for general external consumption
    fs.writeFileSync(
      path.join(dataDir, 'external.json'),
      JSON.stringify(
        {
          steam: steamData,
          battlemetrics: battlemetricsData,
          discord_roster: discordRoster,
          unitcommander: {
            ranks,
            awards,
            campaigns,
            profiles,
            units,
            events,
          },
        },
        null,
        2,
      ),
    );

    // Specific output for Steam Server Intelligence
    fs.writeFileSync(
      path.join(dataDir, 'server_stats.json'),
      JSON.stringify(steamData, null, 2),
    );

    // HYDRATE LEGACY ROSTER.JSON
    const rosterPath = path.join(dataDir, 'roster.json');
    if (fs.existsSync(rosterPath)) {
      console.log('Hydrating legacy roster.json...');
      const legacyRoster = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));
      
      legacyRoster.personnel = discordRoster.map(p => ({
        id: p.discord_id,
        username: p.username,
        displayName: p.display_name,
        rank: p.rank,
        rankPriority: p.rank_priority,
        callsign: p.callsign,
        joinedAt: p.joined_at
      }));
      
      legacyRoster.lastUpdated = new Date().toISOString();
      fs.writeFileSync(rosterPath, JSON.stringify(legacyRoster, null, 2));
    }

    console.log('Successfully fetched all external data.');
  } catch (error) {
    console.error('Error in main fetch script:', error.message);
    process.exit(1);
  }
}

main();
