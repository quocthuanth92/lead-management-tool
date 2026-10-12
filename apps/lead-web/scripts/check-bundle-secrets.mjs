import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const staticDir = path.join(appRoot, '.next', 'static');

const FORBIDDEN_NAMES = [
  'LEAD_SERVICE_URL',
  'LEAD_SOURCE_API_KEY',
  'JWT_SECRET',
  'SEED_SALESPERSON_PASSWORD'
];
const FORBIDDEN_VALUES = [process.env.LEAD_SERVICE_URL, process.env.LEAD_SOURCE_API_KEY].filter(
  (value) => typeof value === 'string' && value.length >= 8
);
const FORBIDDEN = [...FORBIDDEN_NAMES, ...FORBIDDEN_VALUES];

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const fullPath = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
    })
  );
  return nested.flat();
}

const files = (await listFiles(staticDir)).filter((file) => /\.(js|css|html|json|map)$/.test(file));
const leaks = [];

for (const file of files) {
  const content = await readFile(file, 'utf8');
  for (const needle of FORBIDDEN) {
    if (content.includes(needle)) {
      leaks.push({ file: path.relative(appRoot, file), needle });
    }
  }
}

if (leaks.length > 0) {
  console.error('Server-only configuration found in client bundles:');
  for (const leak of leaks) {
    const label = FORBIDDEN_NAMES.includes(leak.needle) ? leak.needle : '[configured value]';
    console.error(` - ${leak.file}: ${label}`);
  }
  process.exit(1);
}

console.log(`Bundle secret check passed (${files.length} static files scanned).`);
