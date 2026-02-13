import { execSync } from 'node:child_process';

const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';

function log(msg, color = RESET) {
  console.log(`${color}${msg}${RESET}`);
}

async function checkRunnerHealth() {
  log('--- CHECKING CI/CD PIPELINE HEALTH ---', GREEN);
  try {
    const rawRuns = execSync(
      'gh run list --limit 5 --json name,status,conclusion,createdAt',
      { encoding: 'utf8' },
    );
    const runs = JSON.parse(rawRuns);
    let failureCount = 0;
    runs.forEach((run) => {
      const conclusion = (run.conclusion || 'PENDING').toUpperCase();
      if (conclusion === 'FAILURE') failureCount++;
      log(`[${conclusion}] ${run.name}`);
    });
    if (failureCount > 0) process.exit(1);
    else log('✓ All recent executions successful.', GREEN);
  } catch {
    process.exit(1);
  }
}
checkRunnerHealth();
