import { execSync } from 'node:child_process';
import fs from 'node:fs';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function log(msg, color = RESET) { console.log(`${color}${msg}${RESET}`); }

async function runSecurityAudit() {
    log('--- STARTING SECURITY AUDIT SUITE ---', GREEN);
    try {
        execSync('npm audit --audit-level=high', { stdio: 'inherit' });
        log('✓ No high-level vulnerabilities found.', GREEN);
    } catch { log('! Dependency vulnerabilities detected.', YELLOW); }

    try {
        if (!fs.existsSync('codeql-db')) {
            execSync('codeql database create codeql-db --language=javascript --overwrite', { stdio: 'inherit' });
        }
        execSync('codeql database analyze codeql-db --format=sarif-latest --output=codeql-results.sarif', { stdio: 'inherit' });
        log('✓ Static analysis complete. Results saved to codeql-results.sarif', GREEN);
    } catch { log('X CodeQL analysis failed.', RED); }
    log('--- SECURITY AUDIT COMPLETE ---', GREEN);
}
runSecurityAudit();
