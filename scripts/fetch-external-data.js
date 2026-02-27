import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { GameDig as Gamedig } from 'gamedig';
import 'dotenv/config';
import rcon from './lib/rcon.js';
import steamApi from './lib/steam_api.js';
import { supabase } from './lib/supabase.js';

/**
 * UKSFTA External Data Fetcher v3.0
 * Redesigned for uksf-mod-theme with Sharding and Dynamic Content Generation
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  bmKey: (process.env.BATTLEMETRICS_API_KEY || '').trim(),
  bmId: process.env.BATTLEMETRICS_SERVER_ID || '35392879',
  ucId: process.env.UNIT_COMMANDER_COMMUNITY_ID || '722',
  ucToken: (process.env.UNIT_COMMANDER_BOT_TOKEN || '').trim(),
  serverIp: process.env.STEAM_SERVER_IP || '127.0.0.1',
  serverPort: parseInt(process.env.STEAM_QUERY_PORT || '2303', 10),
};

const ucClient = axios.create({
  baseURL: `https://api.unitcommander.co.uk/community/${config.ucId}`,
  headers: {
    Authorization: `Bot ${config.ucToken}`,
    Accept: 'application/json',
    'User-Agent': 'UKSFTA-Fetch',
  },
});

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <reason>
async function fetchUC() {
  if (!config.ucToken || !config.ucId) {
    console.warn('[UC_FETCH] Credentials missing. Skipping Unit Commander.');
    return null;
  }
  try {
    console.log(`[UC_FETCH] Querying community ${config.ucId}...`);
    const [campaignsRes, standaloneRes, profilesRes, unitsRes, statusesRes] =
      await Promise.all([
        ucClient.get('/campaigns'),
        ucClient.get('/events'),
        ucClient.get('/profiles'),
        ucClient.get('/units'),
        ucClient.get('/attendance-status'),
      ]);

    const campaigns = campaignsRes.data;
    const standalone = standaloneRes.data;
    const profiles = profilesRes.data;
    const units = unitsRes.data;
    const statuses = statusesRes.data;

    // Identify "Attending" and "Attended" status IDs
    const validStatusIds = Array.isArray(statuses)
      ? statuses
          .filter((s) => {
            const name = (s.name || '').toLowerCase();
            return (
              name.includes('attending') ||
              name.includes('attended') ||
              name.includes('present') ||
              name.includes('confirmed') ||
              s.is_present === true ||
              s.is_present === 1 ||
              s.is_present === '1'
            );
          })
          .map((s) => s.id)
      : [];

    console.log(
      `[UC_ATTENDANCE] Valid Status IDs: ${validStatusIds.join(', ')}`,
    );

    // Fetch nested events for each campaign
    const fullCampaigns = await Promise.all(
      campaigns.map(async (cp) => {
        try {
          const eventsRes = await ucClient.get(`/campaigns/${cp.id}/events`);
          return { ...cp, events: eventsRes.data };
        } catch {
          return { ...cp, events: [] };
        }
      }),
    );

    // Identify the "Current Campaign" (The most recent active one)
    const currentCampaign = campaigns
      .filter((c) => c.status === 'ACTIVE')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

    let officialAverage = 0;

    if (currentCampaign) {
      console.log(
        `[UC_ATTENDANCE] Analyzing current campaign: ${currentCampaign.campaignName} (${currentCampaign.id})`,
      );

      const campaignEvents =
        fullCampaigns.find((c) => c.id === currentCampaign.id)?.events || [];
      let totalAttended = 0;
      let eventsWithData = 0;

      for (const event of campaignEvents) {
        try {
          const url = `/campaigns/${currentCampaign.id}/events/${event.id}/attendance`;
          const attRes = await ucClient.get(url);
          const attendance = attRes.data;

          if (Array.isArray(attendance) && attendance.length > 0) {
            const count = attendance.filter((a) => {
              const statusId = a.attendanceId || a.attendance_status_id;
              return validStatusIds.includes(statusId);
            }).length;

            if (count > 0) {
              totalAttended += count;
              eventsWithData++;
              console.log(
                `[UC_ATTENDANCE] Campaign Event ${event.id}: ${count} present.`,
              );
            }
          }
        } catch (_err) {
          // console.warn(`[UC_ATTENDANCE] Failed for campaign event ${event.id}`);
        }
      }

      officialAverage =
        eventsWithData > 0 ? Math.round(totalAttended / eventsWithData) : 0;
      console.log(
        `[UC_ATTENDANCE] Final Campaign Average: ${officialAverage} (from ${eventsWithData} events)`,
      );
    }

    return {
      campaigns: fullCampaigns,
      standalone,
      profiles,
      units,
      officialAverage,
    };
  } catch (e) {
    console.error('[UC_FETCH] Failed:', e.message);
    return null;
  }
}

async function fetchBM(range) {
  const serverId = config.bmId;
  let cachedData = null;

  // 1. Try to get from Supabase Cache first
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('server_telemetry')
        .select('payload, updated_at')
        .eq('server_id', serverId)
        .eq('range_type', range)
        .single();

      if (!error && data) {
        cachedData = data.payload;
        const age = Date.now() - new Date(data.updated_at).getTime();
        
        // If cache is fresh (less than 30 mins), return it immediately
        if (age < 30 * 60000) {
          console.log(`[BM_CACHE] Using fresh Supabase data for ${range} (${Math.round(age / 60000)}m old)`);
          return cachedData;
        }
      }
    } catch (_e) {
      // Continue to API fetch
    }
  }

  // 2. Fetch from Battlemetrics if cache is old or missing
  if (!config.bmKey) {
    console.warn('[BM_FETCH] API Key missing. Falling back to cache.');
    return cachedData || [];
  }

  const d = new Date();
  if (range === 'month') d.setMonth(d.getMonth() - 1);
  else if (range === 'week') d.setDate(d.getDate() - 7);
  else d.setHours(d.getHours() - 24);

  const url = `https://api.battlemetrics.com/servers/${serverId}/player-count-history?start=${d.toISOString()}&stop=${new Date().toISOString()}`;
  
  try {
    console.log(`[BM_API] Requesting ${range} from Battlemetrics...`);
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${config.bmKey}` },
    });
    const freshData = res.data.data || [];

    if (freshData.length > 0 && supabase) {
      console.log(`[BM_CACHE] Updating Supabase with ${freshData.length} points for ${range}...`);
      await supabase.from('server_telemetry').upsert({
        server_id: serverId,
        range_type: range,
        payload: freshData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'server_id,range_type' });
    }

    return freshData;
  } catch (err) {
    const status = err.response?.status;
    console.warn(`[BM_API] Fetch failed (${status || err.message}).`);
    
    if (cachedData) {
      console.log(`[BM_FALLBACK] API blocked. Using stale Supabase cache for ${range}.`);
      return cachedData;
    }
    
    return [];
  }
}

function compress(data) {
  if (!data || !Array.isArray(data) || data.length === 0) return [];
  const isS = (a, b) =>
    a &&
    b &&
    a.attributes.value === b.attributes.value &&
    a.attributes.max === b.attributes.max &&
    a.attributes.min === b.attributes.min;
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (
      i === 0 ||
      i === data.length - 1 ||
      !isS(data[i], data[i - 1]) ||
      !isS(data[i], data[i + 1])
    ) {
      result.push(data[i]);
    }
  }
  return result;
}

function processCampaigns(campaigns, contentDir) {
  campaigns.forEach((op) => {
    const slug = op.campaignName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const campaignDir = path.join(contentDir, slug);
    if (!fs.existsSync(campaignDir)) {
      fs.mkdirSync(campaignDir, { recursive: true });
    }

    const filePath = path.join(campaignDir, '_index.md');
    const latestEvent = op.events?.length
      ? [...op.events].sort((a, b) => new Date(b.date) - new Date(a.date))[0]
      : null;
    const activeLimit = new Date();
    activeLimit.setDate(activeLimit.getDate() - 30);

    let status = 'ARCHIVED';
    if (
      op.status === 'ACTIVE' ||
      (latestEvent && new Date(latestEvent.date) > activeLimit)
    ) {
      status = 'ACTIVE';
    }

    const mdContent = `---
title: "${op.campaignName}"
date: "${op.created_at}"
layout: "campaign"
op_id: "TF-${op.id}"
map: "${op.map || 'CLASSIFIED'}"
status: "${status}"
image: "${op.image ? op.image.path : ''}"
---

${op.brief || 'No tactical briefing recovered for this operation.'}
`;
    fs.writeFileSync(filePath, mdContent);
  });
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <reason>
async function main() {
  console.log('[JSFC_FETCH] Initiating data sharding sequence...');
  const staticDir = path.join(__dirname, '..', 'static');
  const contentDir = path.join(__dirname, '..', 'content', 'campaigns');
  if (!fs.existsSync(staticDir)) fs.mkdirSync(staticDir, { recursive: true });

  const state = {
    timestamp: Date.now(),
    arma: null,
    unitcommander: null,
    status: 'STABLE',
  };

  try {
    // 1. Arma 3 Server Query
    try {
      console.log(
        `[ARMA_QUERY] Scanning ${config.serverIp}:${config.serverPort}...`,
      );
      const gamedigRes = await Gamedig.query({
        type: 'arma3',
        host: config.serverIp,
        port: config.serverPort,
      });
      state.arma = {
        name: gamedigRes.name,
        map: gamedigRes.map,
        players: gamedigRes.players.length,
        maxPlayers: gamedigRes.maxplayers,
        status: 'online',
        manifest: gamedigRes.players.map((p) => ({
          name: p.name,
          ping: p.ping,
        })),
      };

      // Enrichment via SteamAPI
      try {
        const steamInfo = await steamApi.getServerInfo(config.serverIp);
        if (steamInfo) {
          state.arma.steam = {
            version: steamInfo.version,
            os: steamInfo.os,
            secure: steamInfo.secure,
          };
        }
      } catch (_se) {
        console.warn('[STEAM_API] Enrichment failed.');
      }

      // RCON Verification
      try {
        const rconPlayers = await rcon.getPlayers();
        if (rconPlayers && rconPlayers.length > 0) {
          state.arma.rcon_verified = rconPlayers.length;
        }
      } catch (_re) {
        console.warn('[RCON_QUERY] RCON unreachable or failed.');
      }
    } catch (_e) {
      console.warn('[ARMA_QUERY] Server unreachable.');
    }

    // 2. Unit Commander & Dynamic Content
    const uc = await fetchUC();
    if (uc) {
      fs.writeFileSync(
        path.join(staticDir, 'archives.json'),
        JSON.stringify(uc, null, 2),
      );

      if (!fs.existsSync(contentDir)) {
        fs.mkdirSync(contentDir, { recursive: true });
      }

      processCampaigns(uc.campaigns, contentDir);

      // Fetch Live Alerts for Service Gateway
      let alerts = [];
      try {
        const alertsRes = await ucClient.get(
          `/community/${config.communityId}/alerts`,
        );
        alerts = (alertsRes.data || []).filter((a) => !a.archived).slice(0, 3);
        console.log(
          `[UC_ALERTS] Retrieved ${alerts.length} active service updates.`,
        );
      } catch (_err) {
        console.warn('[UC_ALERTS] Failed to fetch community alerts.');
      }

      // Fetch Accurate Strength via units/players
      let totalStrength = uc.profiles?.length || 0;
      try {
        const upRes = await ucClient.get(
          `/community/${config.communityId}/units/players`,
        );
        const unitData = upRes.data || [];
        // Flatten all players across units and de-duplicate by ID
        const allPlayers = new Set();
        unitData.forEach((u) => {
          if (u.players) {
            for (const p of u.players) {
              allPlayers.add(p.id);
            }
          }
        });
        if (allPlayers.size > 0) {
          totalStrength = allPlayers.size;
          console.log(
            `[UC_STRENGTH] Verified active personnel: ${totalStrength}`,
          );
        }
      } catch (_err) {
        console.warn('[UC_STRENGTH] Failed to fetch unit/player mapping.');
      }

      state.unitcommander = {
        campaigns: uc.campaigns
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 3),
        standalone: uc.standalone.slice(0, 5),
        alerts: alerts.map((a) => ({
          title: a.title,
          content: a.content,
          date: a.created_at,
          severity: a.type || 'info',
        })),
      };
      state.average_attendance = uc.officialAverage;
      state.personnel_count = totalStrength;
    }

    // 3. Battlemetrics Telemetry
    const bmToday = await fetchBM('today');
    const bmWeek = await fetchBM('week');
    const bmMonth = await fetchBM('month');

    const telemetry = {
      timestamp: Date.now(),
      today: compress(bmToday),
      week: compress(bmWeek),
      month: compress(bmMonth),
    };

    // Calculate Average Attendance Fallback (Last 7 Days from Battlemetrics)
    if (!state.average_attendance || state.average_attendance === 0) {
      if (bmWeek && bmWeek.length > 0) {
        const validPoints = bmWeek.filter(
          (p) => p.attributes.value > 0 && p.attributes.value !== 255,
        );
        if (validPoints.length > 0) {
          const sum = validPoints.reduce(
            (acc, p) => acc + p.attributes.value,
            0,
          );
          state.average_attendance = Math.round(sum / validPoints.length);
          console.log(
            `[BM_FALLBACK] Calculated average from telemetry: ${state.average_attendance}`,
          );
        }
      }
    }

    // Calculate Uptime Percentage (Last 30 Days)
    if (bmMonth && bmMonth.length > 0) {
      const totalSamples = bmMonth.length;
      const uptimeSamples = bmMonth.filter(
        (p) => p.attributes.value !== 255,
      ).length;
      state.uptime_percentage = Math.round(
        (uptimeSamples / totalSamples) * 100,
      );
      console.log(`[BM_UPTIME] 30D Uptime: ${state.uptime_percentage}%`);
    } else {
      state.uptime_percentage = 100; // Default to 100 if no data
    }

    if (!state.average_attendance) state.average_attendance = 0;

    fs.writeFileSync(
      path.join(staticDir, 'telemetry.json'),
      JSON.stringify(telemetry, null, 2),
    );

    // 4. Main HUD State
    fs.writeFileSync(
      path.join(staticDir, 'intel.json'),
      JSON.stringify(state, null, 2),
    );

    // 5. Compatibility / Legacy
    const legacyDataDir = path.join(__dirname, '..', 'data');
    if (fs.existsSync(legacyDataDir)) {
      fs.writeFileSync(
        path.join(legacyDataDir, 'external.json'),
        JSON.stringify({ ...state, ...uc }, null, 2),
      );
    }

    console.log('✓ All data shards synchronized successfully.');
  } catch (e) {
    console.error('X Sharding failed:', e);
  }
}

main();
