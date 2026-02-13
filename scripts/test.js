import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function log(msg, color = RESET) {
  console.log(`${color}${msg}${RESET}`);
}

function runCommand(command) {
  try {
    log(`> Running: ${command}`, GREEN);
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch {
    log(`X Command failed: ${command}`, RED);
    return false;
  }
}

async function checkUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, options, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        resolve(true);
      } else {
        reject(new Error(`Status: ${res.statusCode}`));
      }
    });
    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.setTimeout(5000);
    req.end();
  });
}

async function checkServer(url, timeout = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      if (Date.now() - start > timeout) {
        reject(new Error('Server start timeout'));
        return;
      }

      const req = http.get(url, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          reject(new Error(`Server returned status: ${res.statusCode}`));
        }
      });

      req.on('error', () => {
        setTimeout(attempt, 500);
      });

      req.end();
    };
    attempt();
  });
}

function getHugoParam(content, section, key) {
  const regex = new RegExp(
    `\\[params\\.${section}\\][^]*?${key}\\s*=\\s*["']([^"']+)["']`,
    'i',
  );
  const match = content.match(regex);
  return match ? match[1] : null;
}

async function testLinting() {
  log('\n[1/4] Testing Linting Standards...', GREEN);
  if (!runCommand('npm run lint')) {
    process.exit(1);
  }
  log('✓ Linting Passed', GREEN);
}

async function testUplinks() {
  log('\n[2/4] Testing External Uplinks...', GREEN);
  // config.yaml is the new standard
  if (!fs.existsSync('config.yaml')) {
    log('! config.yaml not found, skipping uplink tests', YELLOW);
    return;
  }
  const config = fs.readFileSync('config.yaml', 'utf8');

  const ucId = getHugoParam(config, 'unitcommander', 'community_id');
  const ucToken = getHugoParam(config, 'unitcommander', 'bot_token');
  if (ucId && ucToken) {
    try {
      log(`Checking Unit Commander Uplink (ID: ${ucId})...`, YELLOW);
      await checkUrl(
        `https://api.unitcommander.co.uk/community/${ucId}/campaigns`,
        {
          headers: { Authorization: `Bot ${ucToken}` },
        },
      );
      log('✓ Unit Commander Uplink Stable', GREEN);
    } catch (err) {
      log(`! Unit Commander Uplink Warning: ${err.message}`, YELLOW);
    }
  }

  const discordId = getHugoParam(config, 'discord', 'server_id');
  if (discordId) {
    try {
      log(`Checking Discord API Uplink (ID: ${discordId})...`, YELLOW);
      await checkUrl(`https://discord.com/api/guilds/${discordId}/widget.json`);
      log('✓ Discord Uplink Stable', GREEN);
    } catch (err) {
      log(`! Discord Uplink Warning: ${err.message}`, YELLOW);
    }
  }
}

async function testBuild() {
  log('\n[3/4] Testing Production Build...', GREEN);
  if (!runCommand('npm run build')) {
    process.exit(1);
  }
  log('✓ Build Passed', GREEN);
}

async function testRuntime() {
  log('\n[4/4] Testing Runtime Server...', GREEN);
  const serverProcess = spawn('npm', ['start'], {
    detached: true,
    stdio: 'ignore',
  });

  let intentionalKill = false;
  serverProcess.on('exit', (code) => {
    if (!intentionalKill) {
      log(`\nX Server process exited prematurely with code ${code}.`, RED);
      process.exit(1);
    }
  });

  try {
    log('Waiting for server at http://localhost:1313...', GREEN);
    await checkServer('http://localhost:1313');
    log('✓ Server responded with 200 OK', GREEN);
  } catch (error) {
    log(`X Runtime Test Failed: ${error.message}`, RED);
    intentionalKill = true;
    if (serverProcess.pid) process.kill(-serverProcess.pid);
    process.exit(1);
  } finally {
    intentionalKill = true;
    if (serverProcess.pid) {
      try {
        process.kill(-serverProcess.pid);
      } catch {
        // Ignore
      }
    }
  }
}

async function main() {
  log('--- STARTING UKSF THEME TEST SUITE ---', GREEN);

  await testLinting();
  await testUplinks();
  await testBuild();
  await testRuntime();

  log('\n--- ALL TESTS PASSED ---', GREEN);
  process.exit(0);
}

main();
