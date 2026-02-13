import { execSync } from 'node:child_process';
import fs from 'node:fs';

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function log(msg, color = RESET) { console.log(`${color}${msg}${RESET}`); }

function parseCodeQL(filePath) {
    if (!fs.existsSync(filePath)) return [];
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const findings = [];
    (data.runs || []).forEach(run => {
        (run.results || []).forEach(result => {
            findings.push({
                id: result.ruleId,
                title: `[SECURITY] ${result.ruleId}`,
                severity: result.level === 'error' ? 'critical' : 'high',
                body: `**Vulnerability:** ${result.ruleId}\n**File:** ${result.locations?.[0]?.physicalLocation?.artifactLocation?.uri}\n\n${result.message?.text}`
            });
        });
    });
    return findings;
}

async function syncIssues(findings) {
    log('--- SYNCING ISSUES WITH GITHUB ---', GREEN);
    const rawIssues = execSync('gh issue list --json title,number --state open --label "automated-audit"', { encoding: 'utf8' });
    const existingIssues = JSON.parse(rawIssues);

    for (const issue of existingIssues) {
        if (!findings.find(f => issue.title.includes(f.id))) {
            log(`✓ Resolving Issue #${issue.number}`, GREEN);
            execSync(`gh issue close ${issue.number} --comment "Verification complete. Issue cleared."`);
        }
    }

    for (const finding of findings) {
        if (!existingIssues.find(i => i.title.includes(finding.id))) {
            log(`! Creating New Issue: ${finding.title}`, YELLOW);
            fs.writeFileSync('temp_body.md', finding.body);
            const createOutput = execSync(`gh issue create --title "${finding.title}" --body-file temp_body.md --label "automated-audit" --label "security" --label "${finding.severity}"`, { encoding: 'utf8' });
            const issueNumber = createOutput.trim().split('/').pop();
            fs.unlinkSync('temp_body.md');

            const branchName = `fix/issue-${issueNumber}-${finding.id.replace(/\//g, '-')}`;
            log(`! Creating Fix Branch: ${branchName}`, YELLOW);
            try {
                execSync(`git branch ${branchName} master && git push origin ${branchName}`, { stdio: 'ignore' });
                execSync(`gh issue comment ${issueNumber} --body "Automated fix branch created: 
${branchName}"`);
            } catch {
                // Ignore branch creation failures
            }
        }
    }
}

async function main() {
    const findings = parseCodeQL('codeql-results.sarif');
    await syncIssues(findings);
}
main();
