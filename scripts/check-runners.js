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
      'gh run list --limit 10 --json name,status,conclusion,createdAt',
      { encoding: 'utf8' },
    );
    const runs = JSON.parse(rawRuns);
    
    // Group by workflow name and only keep the latest for each
    const latestRuns = new Map();
    runs.forEach(run => {
      if (!latestRuns.has(run.name)) {
        latestRuns.set(run.name, run);
      }
    });

    let failureCount = 0;
    latestRuns.forEach((run, name) => {
      const conclusion = (run.conclusion || 'PENDING').toUpperCase();
      if (conclusion === 'FAILURE') {
        failureCount++;
        log(`[${conclusion}] ${name} (LATEST)`, '\x1b[31m');
      } else {
        log(`[${conclusion}] ${name} (LATEST)`, GREEN);
      }
    });

    if (failureCount > 0) {
      log(`\n✖ ${failureCount} workflows are currently failing.`, '\x1b[31m');
      process.exit(1);
    } else {
      log('\n✓ All active workflows are operational.', GREEN);
    }
  } catch (err) {
    log(`Error checking health: ${err.message}`, '\x1b[31m');
    process.exit(1);
  }
}
checkRunnerHealth();
