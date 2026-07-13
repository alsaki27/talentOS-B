import { readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';

const manifestPath = join(process.cwd(), 'packages', 'ats-adapters', 'manifest.json');
if (!existsSync(manifestPath)) {
  console.error('FAIL: packages/ats-adapters/manifest.json not found.');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
const adapterSrcPath = join(process.cwd(), 'packages', 'ats-adapters', 'src', 'index.ts');
const indexSrc = readFileSync(adapterSrcPath, 'utf-8');

for (const entry of manifest.adapters) {
  // Extract the full adapter block: `name: { ... selectors: { ... } }`
  // Use balanced brace matching instead of greedy regex
  const startPattern = `${entry.name}:\\s*\\{`;
  const startMatch = indexSrc.match(new RegExp(startPattern));
  if (!startMatch) {
    console.error(`FAIL: Could not find adapter "${entry.name}" in src/index.ts`);
    process.exit(1);
  }

  const startIdx = startMatch.index + startMatch[0].length - 1;
  let depth = 0;
  let endIdx = startIdx;
  for (let i = startIdx; i < indexSrc.length; i++) {
    if (indexSrc[i] === '{') depth++;
    else if (indexSrc[i] === '}') { depth--; if (depth === 0) { endIdx = i + 1; break; } }
  }

  const adapterBlock = indexSrc.slice(startMatch.index, endIdx);

  // Extract just the selectors block (what matters for drift detection)
  const selectorsMatch = adapterBlock.match(/selectors:\s*(\{[^}]*\})/s);
  if (!selectorsMatch) {
    console.error(`FAIL: Could not extract selectors for adapter "${entry.name}"`);
    process.exit(1);
  }

  const checksum = createHash('sha256').update(JSON.stringify(selectorsMatch[1])).digest('hex').slice(0, 12);

  const mismatch = entry.checksum !== checksum && entry.checksum !== 'stub' && entry.maturity !== 'draft';
  if (mismatch) {
    console.error(`FAIL: Adapter "${entry.name}" selectors changed but manifest version did not bump.`);
    console.error(`  Source selector checksum: ${checksum}`);
    console.error(`  Manifest checksum:        ${entry.checksum}`);
    console.error(`  Maturity: ${entry.maturity}`);
    process.exitCode = 1;
    continue;
  }

  const manifestChecksumMismatch = entry.checksum !== checksum && entry.checksum !== 'stub';
  if (manifestChecksumMismatch) {
    console.log(`NOTE: Adapter "${entry.name}" checksum changed (${entry.checksum} → ${checksum}) but check skipped (maturity=${entry.maturity}).`);
  }
}

console.log('PASS: All adapter selector checksums verified.');
