import fs from 'node:fs';
import https from 'node:https';

/**
 * Institutional ORBAT - Discord Sync Script v1.0
 * Pulls server members and roles to generate personnel data.
 * 
 * Requirements:
 * - DISCORD_BOT_TOKEN environment variable
 * - DISCORD_GUILD_ID environment variable
 * - 'Server Members Intent' enabled in Discord Developer Portal
 */

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID || "1321236261553573928";

async function discordRequest(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'discord.com',
            path: `/api/v10${path}`,
            method: 'GET',
            headers: {
                'Authorization': `Bot ${BOT_TOKEN}`,
                'Accept': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`Discord API Error ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (err) => reject(err));
        req.end();
    });
}

async function main() {
    console.log("--- Initializing Institutional ORBAT Sync (Discord) ---");

    if (!BOT_TOKEN) {
        console.error("X Error: DISCORD_BOT_TOKEN not found in environment.");
        console.log("  Please ensure you have set up a bot token in the Discord Developer Portal.");
        process.exit(1);
    }

    try {
        // 1. Fetch Roles (to map ranks and unit weights)
        console.log("> Fetching server roles...");
        const roles = await discordRequest(`/guilds/${GUILD_ID}/roles`);
        
        // 2. Fetch Members (paged, up to 1000)
        console.log("> Fetching server personnel...");
        const members = await discordRequest(`/guilds/${GUILD_ID}/members?limit=1000`);

        // 3. Process and Map Personnel
        const personnel = members.map(m => {
            // Get all role objects for this member
            const memberRoles = roles
                .filter(r => m.roles.includes(r.id))
                .sort((a, b) => b.position - a.position); // Highest role first

            const topRole = memberRoles[0] || { name: "Operator", position: 0 };
            const isIC = memberRoles.some(r => r.name.includes("IC") && !r.name.includes("2IC"));
            const is2IC = memberRoles.some(r => r.name.includes("2IC"));

            // Attempt to determine unit from roles
            // Logic: Look for roles matching SAS, SBS, SRR, etc.
            let unitMatch = "Unassigned";
            const unitKeywords = ["SAS", "SBS", "SRR", "ASOB", "JSFAW", "MEDIC", "INTEL", "SFSG", "RAC"];
            for (const r of memberRoles) {
                const upperRole = r.name.toUpperCase();
                const match = unitKeywords.find(k => upperRole.includes(k));
                if (match) {
                    unitMatch = match;
                    break;
                }
            }

            return {
                name: m.nick || m.user.global_name || m.user.username,
                rank: topRole.name,
                rank_weight: topRole.position,
                unit: unitMatch,
                is_leadership: isIC || is2IC,
                leadership_type: isIC ? "IC" : (is2IC ? "2IC" : null)
            };
        });

        // 4. Sort Personnel: Leadership first, then by Discord Role Position
        personnel.sort((a, b) => {
            if (a.is_leadership && !b.is_leadership) return -1;
            if (!a.is_leadership && b.is_leadership) return 1;
            if (a.leadership_type === "IC" && b.leadership_type === "2IC") return -1;
            if (a.leadership_type === "2IC" && b.leadership_type === "IC") return 1;
            return b.rank_weight - a.rank_weight;
        });

        // 5. Save Data
        fs.writeFileSync('data/personnel.json', JSON.stringify(personnel, null, 2));
        console.log(`✓ Successfully synced ${personnel.length} personnel to data/personnel.json`);

    } catch (err) {
        console.error(`X Sync Failed: ${err.message}`);
        process.exit(1);
    }
}

main();