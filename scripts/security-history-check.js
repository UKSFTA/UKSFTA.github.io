import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';

function log(msg, color = RESET) { console.log(`${color}${msg}${RESET}`); }

async function runHistoryAudit() {
    log('--- STARTING CRYPTOGRAPHIC HISTORY AUDIT ---', GREEN);
    const envPath = path.resolve(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) return;

    const envContent = fs.readFileSync(envPath, 'utf8');
    const secrets = envContent.split('\n')
        .map(line => line.split('=')[1]?.trim().replace(/^["']|["']$/g, ''))
        .filter(val => val && val.length > 8);

    let leaksFound = false;
    secrets.forEach(secret => {
        try {
            const result = execSync(`git log -p --all -S"${secret}" --oneline`, { encoding: 'utf8' }).trim();
            if (result) {
                log(`\n[!] LEAK DETECTED in history commits.`, RED);
                leaksFound = true;
            }
        } catch {
            // Secret string not found in history, ignore error
        }
    });

    if (leaksFound) process.exit(1);
    else log('✓ No active secrets detected in historical logs.', GREEN);
}
runHistoryAudit();
