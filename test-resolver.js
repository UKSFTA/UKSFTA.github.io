const { GameDig: Gamedig } = require('gamedig');
const steamApi = require('./bot/steam_api');
require('dotenv').config();

async function testResolver() {
    console.log("--- STARTING IDENTITY RESOLUTION TEST ---");
    
    // 1. Simulate finding a player on the server (e.g., Chris)
    const simulatedPlayers = [
        { name: 'Chris', raw: { steamid: 'UNKNOWN' } },
        { name: 'lErrorl404l', raw: { steamid: 'UNKNOWN' } } // This is our linked member
    ];
    
    // 2. Mock what we have in steam_links.json
    const localSteamLinks = { "discord123": "76561198173473125" };
    const allKnownSteamIds = Object.values(localSteamLinks);
    
    console.log(`Checking for linked members: ${allKnownSteamIds}`);
    
    // 3. Fetch their actual Steam names
    const memberProfiles = await steamApi.getPlayerSummaries(allKnownSteamIds);
    console.log(`Linked Member Steam Name: "${memberProfiles[0].personaname}"`);

    // 4. Run the Resolution Logic
    simulatedPlayers.forEach(player => {
        let steamId = player.raw.steamid;
        
        if (steamId === 'UNKNOWN') {
            const matchedProfile = memberProfiles.find(
                s => s.personaname.toLowerCase() === player.name.toLowerCase()
            );
            if (matchedProfile) {
                steamId = matchedProfile.steamid;
                console.log(`✅ MATCH FOUND: Player "${player.name}" resolved to SteamID ${steamId}`);
            } else {
                console.log(`❌ NO MATCH: Player "${player.name}" remains UNKNOWN`);
            }
        }
    });
}

testResolver();
