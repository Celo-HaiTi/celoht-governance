import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { findForbiddenMockImports } from '../src/security/prohibitedMocks.js';

const root = process.cwd();
const forbidden: string[] = [];

function walk(dir: string): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) continue;

    const content = readFileSync(full, 'utf8');
    const lines = content.split(/\r?\n/);
    const detected = findForbiddenMockImports(lines);
    for (const value of detected) {
      forbidden.push(`${full.replace(root + '/', '')}:${value}`);
    }
  }
}

walk(join(root, 'src'));
if (forbidden.length > 0) {
  console.error('Prohibited mock-data imports detected:');
  for (const item of forbidden) console.error(`- ${item}`);
  process.exit(1);
}

console.log('PASS: no prohibited mock imports found in src');
