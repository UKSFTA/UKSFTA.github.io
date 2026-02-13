import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameDig as Gamedig } from 'gamedig';
import 'dotenv/config';

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

async function request(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'UKSFTA-Fetch',
        Accept: 'application/json',
        ...headers,
      },
    };
    https
      .get(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch {
              reject(new Error('JSON Error'));
            }
          } else reject(new Error(`HTTP ${res.statusCode} at ${url}`));
        });
      })
      .on('error', reject);
  });
}

async function fetchUC() {
  if (!config.ucToken || !config.ucId) {
    console.warn('[UC_FETCH] Credentials missing. Skipping Unit Commander.');
    return null;
  }
  const h = { Authorization: `Bot ${config.ucToken}` };
  const base = `https://api.unitcommander.co.uk/community/${config.ucId}`;
  try {
    console.log(`[UC_FETCH] Querying community ${config.ucId}...`);
    const [campaigns, standalone, profiles, units, ranks, awards] =
      await Promise.all([
        request(`${base}/campaigns`, h),
        request(`${base}/events`, h),
        request(`${base}/profiles`, h),
        request(`${base}/units`, h),
        request(`${base}/ranks`, h),
        request(`${base}/awards`, h),
      ]);

    // Fetch nested events for each campaign
    const fullCampaigns = await Promise.all(
      campaigns.map(async (cp) => {
        try {
          const events = await request(`${base}/campaigns/${cp.id}/events`, h);
          return { ...cp, events };
        } catch {
          return { ...cp, events: [] };
        }
      }),
    );

    return {
      campaigns: fullCampaigns,
      standalone,
      profiles,
      units,
      ranks,
      awards,
    };
  } catch (e) {
    console.error('[UC_FETCH] Failed:', e.message);
    return null;
  }
}

async function fetchBM(range) {
  if (!config.bmKey) return [];
  const d = new Date();
  if (range === 'month') d.setMonth(d.getMonth() - 1);
  else if (range === 'week') d.setDate(d.getDate() - 7);
  else d.setHours(d.getHours() - 24);

  const url = `https://api.battlemetrics.com/servers/${config.bmId}/player-count-history?start=${d.toISOString()}&stop=${new Date().toISOString()}`;
  try {
    const res = await request(url, { Authorization: `Bearer ${config.bmKey}` });
    return res.data || [];
  } catch {
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

      state.unitcommander = {
        campaigns: uc.campaigns
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 3),
        standalone: uc.standalone.slice(0, 5),
      };
    }

    // 3. Battlemetrics Telemetry
    const telemetry = {
      timestamp: Date.now(),
      today: compress(await fetchBM('today')),
      week: compress(await fetchBM('week')),
    };
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
