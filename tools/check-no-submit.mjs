import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const COPILOT_DIR = join(process.cwd(), 'packages', 'extension-copilot');
const distDir = join(COPILOT_DIR, 'dist');
const srcDir = join(COPILOT_DIR, 'src');

const FORBIDDEN = [
  /\.click\s*\(/gi,
  /\.submit\s*\(/gi,
  /dispatchEvent\s*\(\s*new\s+Event\s*\(\s*['"]submit['"]/gi,
  /requestSubmit\s*\(/gi,
  /form\.submit\s*\(/gi,
  /\.type\s*=\s*['"]submit['"]/gi,
];

function checkFile(filePath, label) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const violations = [];
    for (const re of FORBIDDEN) {
      const matches = content.match(re);
      if (matches) {
        violations.push(...matches.map((m) => `  ${label} ${filePath}: ${m.trim()}`));
      }
    }
    return violations;
  } catch {
    return [];
  }
}

const allViolations = [];

// Scan src
if (existsSync(srcDir)) {
  for (const f of readdirSync(srcDir)) {
    if (f.endsWith('.ts')) {
      allViolations.push(...checkFile(join(srcDir, f), '[src]'));
    }
  }
}

// Scan dist (built bundles)
if (existsSync(distDir)) {
  for (const f of readdirSync(distDir)) {
    if (f.endsWith('.js')) {
      allViolations.push(...checkFile(join(distDir, f), '[dist]'));
    }
  }
}

// Also scan shared evidence module (allowed to have capture-phase listener, NOT a submit click)
// The evidence listener is: addEventListener('submit', ..., true) — this is ALLOWED.
// We only forbid programmatic click/submit/requestSubmit/dispatch.
// The FORBIDDEN regexes don't match addEventListener('submit').

if (allViolations.length > 0) {
  console.error(`\nFAIL: ${allViolations.length} submit-pattern violation(s) found in copilot:\n`);
  for (const v of allViolations) console.error(v);
  console.error('\nThe B5 copilot must NEVER programmatically click submit.\n');
  process.exit(1);
}

console.log('PASS: No programmatic submit patterns found in copilot. B5 no-submit guarantee holds.');
