const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const contentDir = path.join(__dirname, '../content');
const dataFile = path.join(__dirname, '../data/system_stats.json');

function getFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const dirents = fs.readdirSync(dir, { withFileTypes: true });
  const files = dirents.map((dirent) => {
    const res = path.resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res) : res;
  });
  return Array.prototype.concat(...files);
}

try {
  const files = getFiles(contentDir);
  const fileCount = files.length;
  const totalSize = files.reduce((acc, file) => {
    const stats = fs.statSync(file);
    return acc + stats.size;
  }, 0);

  let commitHash = 'UNKNOWN';
  try {
    commitHash = execSync('git rev-parse --short HEAD').toString().trim();
  } catch {}

  const sizeKB = (totalSize / 1024).toFixed(2);
  const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);

  const stats = {
    record_count: fileCount,
    db_size_bytes: totalSize,
    db_size_fmt: sizeMB > 1 ? `${sizeMB} MB` : `${sizeKB} KB`,
    last_sync: new Date().toISOString(),
    node_id: `UK_JSFC_ALPHA_${commitHash.toUpperCase()}`,
    threat_level: 'SUBSTANTIAL',
    active_ops: 0,
  };

  const dataDir = path.dirname(dataFile);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  fs.writeFileSync(dataFile, JSON.stringify(stats, null, 2));
  console.log('System stats generated successfully.');
} catch (error) {
  console.error('Error generating stats:', error.message);
}
