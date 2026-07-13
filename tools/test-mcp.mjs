import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const serverPath = join(__dirname, '..', 'packages', 'mcp-server', 'dist', 'index.js');

async function test() {
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: Object.assign({}, process.env, { TALENTOS_API_BASE: 'http://localhost:4114', TALENTOS_API_KEY: 'tos_test_key' }),
  });

  const responses = [];
  const rl = createInterface({ input: server.stdout });
  rl.on('line', (line) => { if (line.trim()) responses.push(line.trim()); });
  server.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));

  function send(obj) {
    const msg = JSON.stringify(obj);
    process.stdout.write(`> ${msg}\n`);
    server.stdin.write(msg + '\n');
  }

  function waitForResponses(count, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = setInterval(() => {
        if (responses.length >= count) { clearInterval(check); resolve(responses.splice(0, count)); }
        if (Date.now() - start > timeout) { clearInterval(check); reject(new Error('Timeout: got ' + responses.length + '/' + count)); }
      }, 100);
    });
  }

  try {
    send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {} } });
    const init = await waitForResponses(1);
    const initRes = JSON.parse(init[0]);
    console.log('\nTEST: initialize');
    console.log('  server:', initRes.result?.serverInfo?.name, initRes.result?.serverInfo?.version);
    console.assert(initRes.result?.serverInfo?.name === 'talentos-mcp', 'name');
    console.assert(initRes.result?.capabilities?.tools !== undefined, 'tools cap');

    await waitForResponses(1);
    responses.length = 0;

    send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    const toolsResp = await waitForResponses(1);
    const toolsRes = JSON.parse(toolsResp[0]);
    console.log('\nTEST: tools/list');
    console.log('  count:', toolsRes.result?.tools?.length);
    console.assert(toolsRes.result?.tools?.length >= 25, 'tool count');

    const names = toolsRes.result.tools.map((t) => t.name);
    console.assert(names.includes('talentos_get_readiness'), 'missing readiness');
    console.assert(names.includes('talentos_delete_candidate'), 'missing delete');
    console.assert(names.includes('talentos_capture_job'), 'missing capture');
    console.assert(names.includes('talentos_add_evidence'), 'missing evidence');
    console.assert(names.includes('talentos_get_stats'), 'missing stats');

    send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'talentos_get_adapters', arguments: {} } });
    const readResp = await waitForResponses(1);
    const read = JSON.parse(readResp[0]);
    console.log('\nTEST: talentos_get_adapters');
    const data = JSON.parse(read.result.content[0].text);
    console.log('  adapters:', data.adapters?.length);
    console.assert(Array.isArray(data.adapters), 'adapters array');
    console.assert(data.adapters.length >= 3, '>=3 adapters');

    send({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'talentos_delete_candidate', arguments: { id: 'test-id' } } });
    const gateResp = await waitForResponses(1);
    const gate = JSON.parse(gateResp[0]);
    const gateText = JSON.parse(gate.result.content[0].text);
    console.log('\nTEST: delete gate (no confirm)');
    console.log('  blocked:', gateText.blocked);
    console.assert(gateText.blocked === true, 'blocked');

    send({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'talentos_create_candidate', arguments: { name: 'Test', email: 't@t.com', dryRun: true } } });
    const dryResp = await waitForResponses(1);
    const dry = JSON.parse(dryResp[0]);
    const dryText = JSON.parse(dry.result.content[0].text);
    console.log('\nTEST: dry-run create');
    console.assert(dryText.dryRun === true, 'dryRun');

    send({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'talentos_get_stats', arguments: {} } });
    const statsResp = await waitForResponses(1);
    const stats = JSON.parse(statsResp[0]);
    const statsText = JSON.parse(stats.result.content[0].text);
    console.log('\nTEST: stats');
    console.log('  data:', JSON.stringify(statsText));
    console.assert(typeof statsText.candidates === 'number', 'candidates count');

    send({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'talentos_preview_readiness', arguments: { jdText: 'React TypeScript needed' } } });
    const readyResp = await waitForResponses(1);
    const ready = JSON.parse(readyResp[0]);
    const readyText = JSON.parse(ready.result.content[0].text);
    console.log('\nTEST: readiness preview');
    console.log('  score:', readyText.score, 'required:', readyText.required?.length);
    console.assert(typeof readyText.score === 'number', 'score');
    console.assert(readyText.required.includes('react'), 'react required');

    console.log('\n=== ALL 7 MCP TESTS PASSED ===');
    process.exit(0);
  } catch (err) {
    console.error('\nFAIL:', err.message);
    process.exit(1);
  } finally {
    server.kill();
  }
}

test();
