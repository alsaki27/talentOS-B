/**
 * TalentOS MCP Server — JSON-RPC 2.0 over stdio transport.
 *
 * Protocol:
 *   - Messages are JSON-RPC 2.0, newline-delimited on stdin/stdout
 *   - initialize → server responds with capabilities + tools
 *   - tools/list → list all tools
 *   - tools/call → execute a tool
 *   - Stderr is used for logging (audit trail, errors)
 */

import { createInterface } from 'readline';
import { TOOLS, ToolDef } from './tools';
import { executeTool } from './executor';

const SERVER_NAME = 'talentos-mcp';
const SERVER_VERSION = '1.0.0';

function respond(id: string | number, result: unknown): void {
  const msg = JSON.stringify({ jsonrpc: '2.0', id, result });
  process.stdout.write(msg + '\n');
}

function error(id: string | number | null, code: number, message: string): void {
  const msg = JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } });
  process.stdout.write(msg + '\n');
}

function notify(method: string, params: unknown): void {
  const msg = JSON.stringify({ jsonrpc: '2.0', method, params });
  process.stdout.write(msg + '\n');
}

function formatToolForMCP(t: ToolDef): Record<string, unknown> {
  return {
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  };
}

function handleRequest(msg: string): void {
  let req: any;
  try { req = JSON.parse(msg); } catch { return; }

  if (!req || req.jsonrpc !== '2.0') return;

  const { id, method, params } = req;

  try {
    switch (method) {
      case 'initialize':
        respond(id, {
          protocolVersion: '2024-11-05',
          serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
          capabilities: { tools: {} },
        });
        // Send tools/list as notification after initialize
        notify('notifications/initialized', {});
        break;

      case 'tools/list': {
        const tools = TOOLS.map(formatToolForMCP);
        respond(id, { tools });
        break;
      }

      case 'tools/call': {
        if (!params?.name) {
          error(id, -32602, 'Missing tool name');
          return;
        }
        executeTool({ name: params.name, arguments: params.arguments || {} })
          .then((result) => respond(id, result))
          .catch((err) => error(id, -32603, err.message));
        break;
      }

      case 'notifications/initialized':
        // No response needed for notifications
        break;

      default:
        error(id, -32601, `Method not found: ${method}`);
    }
  } catch (err: any) {
    error(id || null, -32603, err.message || 'Internal error');
  }
}

// ── Main ──

process.stderr.write(`TalentOS MCP Server v${SERVER_VERSION} starting...\n`);
process.stderr.write(`API base: ${process.env.TALENTOS_API_BASE || 'http://localhost:4114'}\n`);
process.stderr.write(`Destructive ops limit: 10/min | Bulk cap: 50 | Delete requires confirm:true\n`);
process.stderr.write(`Audit log: ~/.talentos-mcp/audit.log\n\n`);

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: false });

rl.on('line', (line: string) => {
  if (line.trim()) handleRequest(line.trim());
});

rl.on('close', () => {
  process.stderr.write('TalentOS MCP Server shutting down.\n');
  process.exit(0);
});

// Handle termination signals gracefully
process.on('SIGINT', () => { process.stderr.write('\nShutting down...\n'); process.exit(0); });
process.on('SIGTERM', () => { process.stderr.write('\nShutting down...\n'); process.exit(0); });
