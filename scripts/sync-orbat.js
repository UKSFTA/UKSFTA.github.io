import fs from 'node:fs';
import https from 'node:https';

const communityId = "722";
const botToken = "eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJVbml0IENvbW1hbmRlciIsImlhdCI6MTc2OTcxNjY3MX0.F51U2FxtFVB2blAeHvq3KKBs0GC-u0R16V5hZBIlX9Q";

async function fetchMembers() {
    console.log("--- Syncing ORBAT Personnel from Unit Commander ---");
    
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'uksfta.pro.unitcommander.co.uk',
            path: `/api/community/${communityId}/memberships`,
            method: 'GET',
            headers: {
                'Authorization': `Bot ${botToken}`,
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
                    reject(new Error(`API Status ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (err) => reject(err));
        req.end();
    });
}

async function main() {
    try {
        const rawMembers = await fetchMembers();
        
        // Transform and filter
        const personnel = rawMembers.map(m => {
            const roles = m.roles || [];
            const isIC = roles.some(r => r.name.includes("IC") && !r.name.includes("2IC"));
            const is2IC = roles.some(r => r.name.includes("2IC"));
            
            return {
                name: m.nickname || m.user?.username,
                rank: m.rank?.name || "Private",
                rank_weight: m.rank?.order || 0,
                unit: m.unit?.name || "Unassigned",
                is_leadership: isIC || is2IC,
                leadership_type: isIC ? "IC" : (is2IC ? "2IC" : null)
            };
        });

        // Sort: Leadership first, then by rank weight
        personnel.sort((a, b) => {
            if (a.is_leadership && !b.is_leadership) return -1;
            if (!a.is_leadership && b.is_leadership) return 1;
            if (a.leadership_type === "IC" && b.leadership_type === "2IC") return -1;
            if (a.leadership_type === "2IC" && b.leadership_type === "IC") return 1;
            return b.rank_weight - a.rank_weight;
        });

        fs.writeFileSync('data/personnel.json', JSON.stringify(personnel, null, 2));
        console.log(`✓ Successfully synced ${personnel.length} personnel to data/personnel.json`);
    } catch (err) {
        console.error(`X Sync Failed: ${err.message}`);
        // Create an empty array if sync fails to avoid build errors
        if (!fs.existsSync('data/personnel.json')) {
            fs.writeFileSync('data/personnel.json', '[]');
        }
    }
}

main();
