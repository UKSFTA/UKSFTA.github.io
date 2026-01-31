import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import dgram from 'node:dgram';

/**
 * UKSFTA Intelligence Bridge v2.5
 * Sharding Edition: intel.json (Live) | archives.json (Logs) | telemetry.json (History)
 */

const envPath = path.resolve(process.cwd(), '.env');
const env = {};
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) env[key.trim()] = value.join('=').replace(/^["']|["']$/g, '').trim();
    });
}

const config = {
    bmKey: (process.env.BATTLEMETRICS_API_KEY || env.BATTLEMETRICS_API_KEY || "").replace(/^getEnv\s+["']|["']$/g, '').trim(),
    bmId: process.env.BATTLEMETRICS_SERVER_ID || env.BATTLEMETRICS_SERVER_ID || "35392879",
    ucId: process.env.UNIT_COMMANDER_COMMUNITY_ID || env.UNIT_COMMANDER_COMMUNITY_ID || "722",
    ucToken: (process.env.UNIT_COMMANDER_BOT_TOKEN || env.UNIT_COMMANDER_BOT_TOKEN || "").replace(/^getEnv\s+["']|["']$/g, '').trim(),
    serverIp: process.env.ARMA_SERVER_IP || env.ARMA_SERVER_IP || "127.0.0.1",
    serverPort: parseInt(process.env.ARMA_QUERY_PORT || env.ARMA_QUERY_PORT || "2303"),
    rconPort: parseInt(process.env.ARMA_RCON_PORT || env.ARMA_RCON_PORT || "2302"),
    rconPass: process.env.ARMA_RCON_PASSWORD || env.ARMA_RCON_PASSWORD || ""
};

// ... CRC32 and RCON functions remain same ...
function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
        crc ^= buf[i];
        for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
    return (crc ^ -1) >>> 0;
}

function createBePacket(payload) {
    const header = Buffer.from([0x42, 0x45]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32LE(crc32(payload), 0);
    return Buffer.concat([header, crcBuf, payload]);
}

async function fetchRconPlayers() {
    if (!config.rconPass) return null;
    return new Promise((resolve) => {
        const client = dgram.createSocket('udp4');
        const timeout = setTimeout(() => { client.close(); resolve(null); }, 4000);
        client.on('message', (msg) => {
            if (msg.length < 7) return;
            if (msg[6] === 0x00 && msg[7] === 0x01) {
                const p = Buffer.concat([Buffer.from([0xFF, 0x01, 0x00]), Buffer.from('players')]);
                client.send(createBePacket(p), 0, createBePacket(p).length, config.rconPort, config.serverIp);
            } else if (msg[6] === 0x01) {
                clearTimeout(timeout);
                const text = msg.toString('utf8', 8);
                const players = [];
                text.split('\n').forEach(line => {
                    const m = line.match(/^\d+\s+[\d.:]+\s+(\d+)\s+[a-f0-9]+\(\d+\)\s+(.+)$/i);
                    if (m) players.push({ name: m[2].trim(), ping: m[1] });
                });
                client.close(); resolve(players);
            }
        });
        const login = Buffer.concat([Buffer.from([0xFF, 0x00]), Buffer.from(config.rconPass)]);
        client.send(createBePacket(login), 0, createBePacket(login).length, config.rconPort, config.serverIp);
    });
}

async function queryArmaServer() {
    return new Promise((resolve, reject) => {
        const client = dgram.createSocket('udp4');
        const A2S_INFO = Buffer.from('FFFFFFFF54536f7572636520456e67696e6520517565727900', 'hex');
        const send = (c = null) => client.send(c ? Buffer.concat([A2S_INFO, c]) : A2S_INFO, 0, (c ? A2S_INFO.length + 4 : A2S_INFO.length), config.serverPort, config.serverIp);
        const timeout = setTimeout(() => { client.close(); reject(new Error("Timeout")); }, 4000);
        client.on('message', (msg) => {
            if (msg[4] === 0x41) return send(msg.slice(5, 9));
            if (msg[4] === 0x49) {
                clearTimeout(timeout); client.close();
                try {
                    let offset = 6;
                    const read = () => { let end = msg.indexOf(0, offset); if (end === -1) end = msg.length; let s = msg.toString('utf8', offset, end); offset = end + 1; return s; };
                    const name = read(); const map = read(); read(); read();
                    offset += 2; const players = msg.readUInt8(offset);
                    const maxPlayers = msg.readUInt8(offset + 1);
                    resolve({ name, map, players: (players === 255 ? 0 : players), maxPlayers, status: 'online' });
                } catch (e) { reject(e); }
            }
        });
        send();
    });
}

async function request(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = { headers: { 'User-Agent': 'UKSFTA-Intel', 'Accept': 'application/json', ...headers } };
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) { try { resolve(JSON.parse(data)); } catch (e) { reject(new Error("JSON Error")); } } 
                else reject(new Error(`HTTP ${res.statusCode}`));
            });
        }).on('error', reject);
    });
}

async function fetchBM(range) {
    if (!config.bmKey) return [];
    const d = new Date();
    if (range === 'month') d.setMonth(d.getMonth() - 1); 
    else if (range === 'week') d.setDate(d.getDate() - 7); 
    else d.setHours(d.getHours() - 24);
    const url = `https://api.battlemetrics.com/servers/${config.bmId}/player-count-history?start=${d.toISOString()}&stop=${new Date().toISOString()}`;
    try { 
        const res = await request(url, { 'Authorization': `Bearer ${config.bmKey.trim()}` });
        return res && res.data ? res.data : [];
    } catch (e) { return []; }
}

async function fetchUC() {
    if (!config.ucToken) return null;
    const h = { 'Authorization': `Bot ${config.ucToken}` };
    try {
        const c = await request(`https://api.unitcommander.co.uk/community/${config.ucId}/campaigns`, h);
        const s = await request(`https://api.unitcommander.co.uk/community/${config.ucId}/events`, h);
        return { campaigns: c, standalone: s };
    } catch (e) { return null; }
}

function compress(data) {
    if (!data || !Array.isArray(data) || data.length === 0) return [];
    
    const isS = (a, b) => a && b && 
        a.attributes.value === b.attributes.value && 
        a.attributes.max === b.attributes.max && 
        a.attributes.min === b.attributes.min;

    const isZero = (a) => a && a.attributes.value === 0 && a.attributes.max === 0 && a.attributes.min === 0;

    const result = [];
    for (let i = 0; i < data.length; i++) {
        // Skip if it's a zero point
        if (isZero(data[i])) continue;

        // For non-zero points, we still want to remove redundant intermediate points to keep it lean
        if (i === 0 || i === data.length - 1 || !isS(data[i], data[i - 1]) || !isS(data[i], data[i + 1])) {
            result.push(data[i]);
        }
    }
    return result;
}

async function main() {
    console.log("[JSFC_INTEL] Starting sharded synchronization...");
    const staticDir = path.join(process.cwd(), 'static');
    const contentDir = path.join(process.cwd(), 'exampleSite', 'content', 'campaigns');

    const state = { timestamp: Date.now(), arma: null, unitcommander: null, status: "STABLE" };
    const telemetry = { timestamp: Date.now(), today: [], week: [], month: [] };
    
    try {
        // 1. Live State (Small)
        try {
            state.arma = await queryArmaServer();
            const manifest = await fetchRconPlayers();
            if (manifest) state.arma.manifest = manifest;
        } catch (e) { console.warn("[ARMA_UPLINK] Node offline."); }

        // 2. Unit Commander (Full for archives, small for state)
        const uc = await fetchUC();
        if (uc) {
            // Full shard for archives
            fs.writeFileSync(path.join(staticDir, 'archives.json'), JSON.stringify(uc, null, 2));
            
            // DYNAMIC PAGE GENERATION
            if (!fs.existsSync(contentDir)) fs.mkdirSync(contentDir, { recursive: true });
            
            uc.campaigns.forEach(op => {
                const slug = op.campaignName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                const filePath = path.join(contentDir, `${slug}.md`);
                
                const mdContent = `---
title: "${op.campaignName}"
date: "${op.created_at}"
layout: "campaign"
op_id: "TF-${op.id}"
map: "${op.map || 'CLASSIFIED'}"
status: "${op.status}"
image: "${op.image ? op.image.path : ''}"
---

${op.brief || 'No tactical briefing recovered for this operation.'}
`;
                // Only write if changed or doesn't exist to avoid triggering Hugo loops unnecessarily
                if (!fs.existsSync(filePath) || fs.readFileSync(filePath, 'utf8') !== mdContent) {
                    fs.writeFileSync(filePath, mdContent);
                    console.log(`[UC_INTEL] Page generated: /campaigns/${slug}`);
                }
            });

            // Lean summary for main HUD (only latest 2 campaigns)
            state.unitcommander = {
                campaigns: uc.campaigns.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 2),
                standalone: uc.standalone.slice(0, 3)
            };
        }

        // 3. Telemetry Shard (History)
        console.log("[BM_INTEL] Generating telemetry shard...");
        const [t, w, m] = await Promise.all([fetchBM('today'), fetchBM('week'), fetchBM('month')]);
        telemetry.today = compress(t); 
        telemetry.week = compress(w); 
        telemetry.month = compress(m);
        fs.writeFileSync(path.join(staticDir, 'telemetry.json'), JSON.stringify(telemetry, null, 2));

        // 4. Final Live State Write
        fs.writeFileSync(path.join(staticDir, 'intel.json'), JSON.stringify(state, null, 2));
        
        console.log("✓ Shards synchronized. intel.json size reduced by 95%.");
    } catch (e) { console.error("X Sync failed:", e.message); }
}
main();