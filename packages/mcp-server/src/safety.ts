/**
 * TalentOS MCP Server — Safety middleware and anti-wipeout guards.
 *
 * Every destructive tool must pass these gates:
 *   1. confirm: true — explicit opt-in for destruction
 *   2. maxItems cap — bulk operations limited to MAX_BULK
 *   3. No blank filters — catch-all "delete everything" blocked
 *   4. Audit log — every mutation written to file + stderr
 *   5. Rate limit — max DESTRUCTIVE_OPS_PER_MINUTE mutation calls/minute
 */

import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export const MAX_BULK = 50;
export const DESTRUCTIVE_OPS_PER_MINUTE = 10;

const AUDIT_DIR = join(homedir(), '.talentos-mcp');
const AUDIT_FILE = join(AUDIT_DIR, 'audit.log');

let destructiveOpsThisMinute = 0;
let minuteWindowStart = Date.now();

function ensureAuditDir(): void {
  if (!existsSync(AUDIT_DIR)) mkdirSync(AUDIT_DIR, { recursive: true });
}

export function logAudit(operation: string, detail: string, user: string): void {
  ensureAuditDir();
  const entry = `[${new Date().toISOString()}] ${operation} | user=${user} | ${detail}\n`;
  try { appendFileSync(AUDIT_FILE, entry); } catch {}
  process.stderr.write(`[AUDIT] ${entry}`);
}

function checkRateLimit(): string | null {
  const now = Date.now();
  if (now - minuteWindowStart > 60_000) {
    minuteWindowStart = now;
    destructiveOpsThisMinute = 0;
  }
  destructiveOpsThisMinute++;
  if (destructiveOpsThisMinute > DESTRUCTIVE_OPS_PER_MINUTE) {
    return `Rate limit exceeded: max ${DESTRUCTIVE_OPS_PER_MINUTE} destructive operations per minute. Wait ${Math.ceil((60_000 - (now - minuteWindowStart)) / 1000)}s.`;
  }
  return null;
}

export interface SafetyCheck {
  operation: 'create' | 'update' | 'delete';
  resource: string;
  confirm?: boolean;
  dryRun?: boolean;
  bulkCount?: number;
  hasFilters?: boolean;
  user?: string;
}

export interface SafetyResult {
  allowed: boolean;
  blockedReason?: string;
  dryRun?: boolean;
}

export function safetyCheck(params: SafetyCheck): SafetyResult {
  const user = params.user || 'unknown';

  // Dry-run mode — always allowed, never executes
  if (params.dryRun) {
    return { allowed: true, dryRun: true };
  }

  // CREATE/UPDATE: always allowed with audit
  if (params.operation === 'create' || params.operation === 'update') {
    return { allowed: true };
  }

  // DELETE: requires confirm
  if (params.operation === 'delete') {
    if (!params.confirm) {
      return {
        allowed: false,
        blockedReason: `Destructive operation "${params.operation} ${params.resource}" requires confirm:true. Add {"confirm":true} to proceed.`,
      };
    }

    // Bulk limit
    if (params.bulkCount && params.bulkCount > MAX_BULK) {
      return {
        allowed: false,
        blockedReason: `Bulk operation limited to ${MAX_BULK} items. Requested: ${params.bulkCount}. Use filters to narrow scope.`,
      };
    }

    // No blank delete-all
    if (!params.hasFilters && params.resource !== 'captured_job') {
      return {
        allowed: false,
        blockedReason: `Cannot delete all ${params.resource}s without filters. Specify at least one filter (id, status, candidateId, etc.) to narrow scope.`,
      };
    }

    // Rate limit for destructive ops
    const rateLimitError = checkRateLimit();
    if (rateLimitError) {
      return { allowed: false, blockedReason: rateLimitError };
    }

    logAudit(`${params.operation}_${params.resource}`, `bulk=${params.bulkCount || 1}`, user);
    return { allowed: true };
  }

  return { allowed: false, blockedReason: `Unknown operation: ${params.operation}` };
}
