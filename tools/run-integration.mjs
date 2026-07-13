import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

async function waitForPort(port, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(`http://localhost:${port}/_debug/state`);
      if (res.ok) return true;
    } catch {}
    await setTimeout(200);
  }
  return false;
}

console.log('Starting mock A4 server...');
const mock = spawn('node', ['tools/mock-a4-server.mjs'], {
  cwd: process.cwd(),
  stdio: 'pipe',
  env: { ...process.env, PORT: '4114' },
});

mock.stdout.on('data', (d) => process.stdout.write(`[mock] ${d}`));
mock.stderr.on('data', (d) => process.stderr.write(`[mock-err] ${d}`));

try {
  const ready = await waitForPort(4114);
  if (!ready) { console.error('Mock server failed to start'); mock.kill(); process.exit(1); }
  console.log('Mock server ready. Running integration tests...');

  const { execSync } = await import('child_process');
  execSync('node --test test-integration/a4-contract.test.mjs', {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: { ...process.env, TALENTOS_TEST_API: 'http://localhost:4114', TALENTOS_TEST_KEY: 'tos_test_00000000000000000000000000' },
  });
  console.log('Integration tests passed.');
} catch (e) {
  console.error('Integration tests FAILED:', e.message);
  mock.kill();
  process.exit(1);
} finally {
  mock.kill();
}
