import { build } from 'esbuild';
import { copyFileSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';

const pkgName = process.argv[2];
if (!pkgName) { console.error('Usage: node build-extension.mjs <package-name>'); process.exit(1); }

const pkgPath = join(process.cwd(), 'packages', pkgName);
const manifest = JSON.parse(readFileSync(join(pkgPath, 'manifest.json'), 'utf-8'));
const version = manifest.version;
const clientVersion = `${pkgName}/${version}`;

const dist = join(pkgPath, 'dist');
mkdirSync(dist, { recursive: true });

const entries = [];
const srcDir = join(pkgPath, 'src');
for (const f of readdirSync(srcDir)) {
  if (f.endsWith('.ts') && !f.endsWith('.d.ts')) {
    entries.push(join(srcDir, f));
  }
}

await build({
  entryPoints: entries,
  bundle: true,
  outdir: dist,
  format: 'iife',
  target: 'chrome88',
  platform: 'browser',
  define: { 'TALENTOS_CLIENT_VERSION': `"${clientVersion}"` },
  minify: false,
  sourcemap: false,
  external: ['chrome'],
});

copyFileSync(join(pkgPath, 'manifest.json'), join(dist, 'manifest.json'));

const iconsDir = join(pkgPath, 'icons');
const distIcons = join(dist, 'icons');
if (existsSync(iconsDir)) {
  mkdirSync(distIcons, { recursive: true });
  for (const f of readdirSync(iconsDir)) {
    copyFileSync(join(iconsDir, f), join(distIcons, f));
  }
}
if (existsSync(join(pkgPath, 'options.html'))) {
  copyFileSync(join(pkgPath, 'options.html'), join(dist, 'options.html'));
}

console.log(`Built ${pkgName} v${version} -> ${dist}`);
