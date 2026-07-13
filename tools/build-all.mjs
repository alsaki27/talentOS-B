import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const packages = [
  { name: 'shared', build: 'npx tsc -p packages/shared/tsconfig.json', type: 'tsc' },
  { name: 'ats-adapters', build: 'npx tsc -p packages/ats-adapters/tsconfig.json', type: 'tsc' },
  { name: 'browser-profiles', build: 'npx tsc -p packages/browser-profiles/tsconfig.json', type: 'tsc' },
  { name: 'readiness-engine', build: 'npx tsc -p packages/readiness-engine/tsconfig.json', type: 'tsc' },
  { name: 'mcp-server', build: 'npx tsc -p packages/mcp-server/tsconfig.json', type: 'tsc' },
  { name: 'extension-job-capture', build: 'node tools/build-extension.mjs extension-job-capture', type: 'esbuild' },
  { name: 'extension-qa', build: 'node tools/build-extension.mjs extension-qa', type: 'esbuild' },
  { name: 'extension-copilot', build: 'node tools/build-extension.mjs extension-copilot', type: 'esbuild' },
];

for (const pkg of packages) {
  const pkgPath = join(process.cwd(), 'packages', pkg.name);
  if (!existsSync(pkgPath)) { console.log(`SKIP ${pkg.name} (not found)`); continue; }
  console.log(`BUILD ${pkg.name}...`);
  try {
    execSync(pkg.build, { cwd: process.cwd(), stdio: 'inherit' });
    console.log(`  OK ${pkg.name}`);
  } catch (e) {
    console.error(`  FAIL ${pkg.name}: ${e.message}`);
    process.exit(1);
  }
}
console.log('All packages built.');
