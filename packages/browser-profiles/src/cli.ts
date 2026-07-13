#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const PROFILE_BASE = path.join(
  process.env.HOME || process.env.USERPROFILE || '/tmp',
  'TalentOSProfiles'
);

interface ProfileMarker {
  candidate_id: string;
  created_at: string;
  email: string;
  linkedin: string | null;
  decommissioned_at?: string;
}

// ── Minimal color helpers (no deps) ──
const c = { reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m', green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m', magenta: '\x1b[35m' };
const color = (s: string, code: string) => `${code}${s}${c.reset}`;

// ── File ops ──
function getProfileDir(id: string): string { return path.join(PROFILE_BASE, id); }
function getMarkerPath(id: string): string { return path.join(getProfileDir(id), '.talentos-profile'); }

function readMarker(id: string): ProfileMarker | null {
  try { return JSON.parse(fs.readFileSync(getMarkerPath(id), 'utf-8')); } catch { return null; }
}

function writeMarker(id: string, marker: ProfileMarker): void {
  fs.mkdirSync(getProfileDir(id), { recursive: true });
  fs.writeFileSync(getMarkerPath(id), JSON.stringify(marker, null, 2));
}

function locateChrome(): string {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  if (process.platform === 'win32') {
    for (const p of [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    ]) { if (fs.existsSync(p)) return p; }
  }
  if (process.platform === 'darwin') return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  return 'google-chrome';
}

// ── Help ──
const COMMANDS: Record<string, { args: string; desc: string }> = {
  create: { args: '<candidateId> <email> [linkedinUrl]', desc: 'Create a new isolated browser profile' },
  list: { args: '', desc: 'List all candidate profiles' },
  verify: { args: '<candidateId>', desc: 'Verify a profile marker is valid' },
  launch: { args: '<candidateId>', desc: 'Open Chrome with this isolated profile' },
  decommission: { args: '<candidateId> [--purge]', desc: 'Decommission a profile (--purge also deletes files)' },
};

function printBanner(): void {
  console.log(color('\n  TalentOS Browser Profile Manager v0.2.0', c.bold + c.magenta));
  console.log(color('  Isolated Chrome profiles for candidate extension testing\n', c.dim));
}

function printHelp(cmd?: string): void {
  if (cmd && COMMANDS[cmd]) {
    const info = COMMANDS[cmd];
    console.log(`\n  ${color('talentos-profile', c.bold)} ${color(cmd, c.cyan)} ${info.args}`);
    console.log(`  ${info.desc}\n`);
    return;
  }

  printBanner();
  console.log(`  ${color('Usage:', c.bold)} talentos-profile ${color('<command>', c.dim)} [args]\n`);
  console.log(`  ${color('Commands:', c.bold)}\n`);
  for (const [name, info] of Object.entries(COMMANDS)) {
    const paddedName = color(name.padEnd(16), c.cyan);
    const paddedArgs = color(info.args.padEnd(32), c.dim);
    console.log(`    ${paddedName} ${paddedArgs} ${info.desc}`);
  }
  console.log(`\n  Run ${color('talentos-profile <command> --help', c.dim)} for per-command details.\n`);
}

// ── Commands ──

function cmdCreate(): void {
  const [candidateId, email, linkedinUrl] = args;
  if (!candidateId || !email) {
    console.log(color('\n  ✗ Missing required arguments.', c.red));
    printHelp('create');
    process.exit(1);
  }

  if (readMarker(candidateId)) {
    console.log(color(`\n  ✗ Profile "${candidateId}" already exists.`, c.red));
    console.log(color(`  Decommission it first: talentos-profile decommission ${candidateId}`, c.dim));
    process.exit(1);
  }

  const marker: ProfileMarker = {
    candidate_id: candidateId,
    created_at: new Date().toISOString(),
    email,
    linkedin: linkedinUrl || null,
  };

  writeMarker(candidateId, marker);
  const dir = getProfileDir(candidateId);

  console.log(color(`\n  ✓ Profile created: ${candidateId}`, c.green));
  console.log(color(`    Directory: ${dir}`, c.dim));
  console.log(color(`    Email:     ${email}`, c.dim));
  if (linkedinUrl) console.log(color(`    LinkedIn:  ${linkedinUrl}`, c.dim));
  console.log();
  console.log(`  ${color('Next steps:', c.bold)}`);
  console.log(`    1. ${color(`talentos-profile launch ${candidateId}`, c.cyan)}`);
  console.log(`    2. In Chrome, load the TalentOS extensions (Load unpacked → dist/)`);
  console.log(`    3. Open extension Options → set Candidate ID: ${color(candidateId, c.yellow)}`);
  console.log(`    4. Paste your API key (starts with ${color('tos_', c.yellow)})`);
  console.log();
}

function cmdList(): void {
  console.log();

  if (!fs.existsSync(PROFILE_BASE)) {
    console.log(color('  No profiles found. Create one with:', c.dim));
    console.log(color('    talentos-profile create <id> <email>', c.cyan));
    console.log();
    return;
  }

  const entries = fs.readdirSync(PROFILE_BASE);
  if (entries.length === 0) {
    console.log(color('  No profiles found.', c.dim));
    console.log();
    return;
  }

  console.log(color('  Profiles:', c.bold));
  for (const entry of entries) {
    const marker = readMarker(entry);
    if (!marker) {
      console.log(color(`    ${entry}  (invalid marker)`, c.red));
      continue;
    }
    const status = marker.decommissioned_at
      ? color(`[DECOMMISSIONED ${marker.decommissioned_at.slice(0, 10)}]`, c.yellow)
      : color('[active]', c.green);
    const date = marker.created_at.slice(0, 10);
    console.log(`    ${color(entry, c.cyan)}  ${marker.email}  ${date}  ${status}`);
    if (marker.linkedin) console.log(color(`      LinkedIn: ${marker.linkedin}`, c.dim));
  }
  console.log();
}

function cmdVerify(): void {
  const [id] = args;
  if (!id) {
    console.log(color('\n  ✗ Missing candidateId.', c.red));
    printHelp('verify');
    process.exit(1);
  }

  const marker = readMarker(id);
  if (!marker) {
    console.log(color(`\n  ✗ Profile "${id}" not found.`, c.red));
    process.exit(1);
  }

  if (!marker.candidate_id || !marker.email || !marker.created_at) {
    console.log(color('\n  ✗ Profile marker is corrupted.', c.red));
    console.log(color('    Re-create: talentos-profile create <new-id> <email>', c.dim));
    process.exit(1);
  }

  if (marker.decommissioned_at) {
    console.log(color(`\n  ⚠ Profile "${id}" was decommissioned on ${marker.decommissioned_at.slice(0, 10)}.`, c.yellow));
    process.exit(1);
  }

  console.log(color(`\n  ✓ Profile "${id}" is valid.`, c.green));
  console.log(color(`    Email:     ${marker.email}`, c.dim));
  console.log(color(`    Created:   ${new Date(marker.created_at).toLocaleString()}`, c.dim));
  if (marker.linkedin) console.log(color(`    LinkedIn:  ${marker.linkedin}`, c.dim));
  console.log();
}

function cmdLaunch(): void {
  const [id] = args;
  if (!id) {
    console.log(color('\n  ✗ Missing candidateId.', c.red));
    printHelp('launch');
    process.exit(1);
  }

  const marker = readMarker(id);
  if (!marker) {
    console.log(color(`\n  ✗ Profile "${id}" not found. Create one first.`, c.red));
    process.exit(1);
  }

  if (marker.decommissioned_at) {
    console.log(color(`\n  ✗ Profile "${id}" was decommissioned — cannot resurrect.`, c.red));
    console.log(color('    Create a new profile: talentos-profile create <new-id> <email>', c.dim));
    process.exit(1);
  }

  const chrome = locateChrome();
  const dir = getProfileDir(id);
  console.log(color(`\n  Launching Chrome with profile: ${id}`, c.cyan));
  console.log(color(`  Directory: ${dir}`, c.dim));
  console.log();

  try {
    execSync(`"${chrome}" --user-data-dir="${dir}" --no-first-run`, { stdio: 'inherit' });
  } catch {
    console.log(color(`\n  ✗ Failed to launch Chrome.`, c.red));
    console.log(color(`    Tried: ${chrome}`, c.dim));
    console.log(color(`    Set CHROME_PATH env var to your Chrome executable location.`, c.dim));
    process.exit(1);
  }
}

function cmdDecommission(): void {
  const id = args[0];
  const purge = args.includes('--purge');

  if (!id) {
    console.log(color('\n  ✗ Missing candidateId.', c.red));
    printHelp('decommission');
    process.exit(1);
  }

  const marker = readMarker(id);
  if (!marker) {
    console.log(color(`\n  ✗ Profile "${id}" not found.`, c.red));
    process.exit(1);
  }

  if (marker.decommissioned_at) {
    console.log(color(`\n  Profile "${id}" is already decommissioned (since ${marker.decommissioned_at.slice(0, 10)}).`, c.yellow));
    process.exit(0);
  }

  marker.decommissioned_at = new Date().toISOString();
  writeMarker(id, marker);

  if (purge) {
    fs.rmSync(getProfileDir(id), { recursive: true, force: true });
    console.log(color(`\n  ✓ Decommissioned + purged: ${id}`, c.green));
  } else {
    console.log(color(`\n  ✓ Decommissioned: ${id}`, c.green));
    console.log(color('    Tombstone written — profile cannot be resurrected.', c.dim));
    console.log(color('    Add --purge to also delete the directory.', c.dim));
  }
  console.log();
}

// ── Router ──
const [,, command, ...args] = process.argv;

if (args.includes('--help') || args.includes('-h')) {
  printHelp(command || undefined);
  process.exit(0);
}

switch (command) {
  case 'create': cmdCreate(); break;
  case 'list': cmdList(); break;
  case 'verify': cmdVerify(); break;
  case 'launch': cmdLaunch(); break;
  case 'decommission': cmdDecommission(); break;
  default:
    printHelp();
    if (command) {
      console.log(color(`  Unknown command: ${command}`, c.red));
    }
    process.exit(command ? 1 : 0);
}
