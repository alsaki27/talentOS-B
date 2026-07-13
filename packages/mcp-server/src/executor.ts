import * as api from './client';
import { safetyCheck, logAudit } from './safety';
import { ToolCall, TOOLS } from './tools';

export async function executeTool(call: ToolCall): Promise<{ content: Array<{ type: string; text: string }> }> {
  const tool = TOOLS.find((t) => t.name === call.name);
  if (!tool) {
    return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${call.name}` }) }] };
  }

  const args = call.arguments;
  const dryRun = !!args.dryRun;

  try {
    // Safety gate for destructive tools
    if (tool.destructive) {
      const safety = safetyCheck({
        operation: 'delete',
        resource: tool.name.replace('talentos_delete_', ''),
        confirm: !!args.confirm,
        dryRun,
        hasFilters: !!args.id,
        user: 'mcp-client',
      });
      if (!safety.allowed) {
        return { content: [{ type: 'text', text: JSON.stringify({ blocked: true, reason: safety.blockedReason }) }] };
      }
      if (safety.dryRun) {
        return { content: [{ type: 'text', text: JSON.stringify({ dryRun: true, tool: call.name, args, message: 'Dry run — no changes made.' }) }] };
      }
    }

    let result: unknown;

    switch (call.name) {
      // ── Read tools ──
      case 'talentos_list_candidates': {
        const state = await api.getDebugState();
        result = { candidates: [{ id: 'cand_demo', name: 'Jane Doe', email: 'jane@example.com', status: 'active' }], total: 1, _note: 'Mock seed. Production queries candidates table.' };
        break;
      }
      case 'talentos_get_candidate':
        result = { id: args.id, name: 'Jane Doe', email: 'jane@example.com', status: 'active', _note: 'Mock seed. Production queries with JOINs.' };
        break;
      case 'talentos_list_jobs':
        result = { jobs: [{ id: 'job_seed_0001', title: 'Senior React Developer', company: 'Acme Corp', location: 'Remote' }], total: 1, _note: 'Mock seed.' };
        break;
      case 'talentos_get_job':
        result = { id: args.id, title: 'Senior React Developer', company: 'Acme Corp', _note: 'Mock seed.' };
        break;
      case 'talentos_list_applications':
        result = { applications: [{ id: 'app_0001', candidate_id: 'cand_demo', job_id: 'job_seed_0001', status: 'approved', review_status: 'approved' }], total: 1, _note: 'Mock seed.' };
        break;
      case 'talentos_get_application':
        result = { id: args.id, status: 'approved', review_status: 'approved', _note: 'Mock seed.' };
        break;
      case 'talentos_get_readiness':
        result = await api.getReadiness(args.applicationId as string);
        break;
      case 'talentos_preview_readiness':
        result = await api.previewReadiness(args.jdText as string);
        break;
      case 'talentos_get_queue_next':
        result = await api.getQueueNext(args.candidateId as string);
        break;
      case 'talentos_get_adapters':
        result = await api.getAdaptersManifest();
        break;
      case 'talentos_list_evidence': {
        const state = await api.getDebugState();
        result = { evidence: (state as any)?.candidateSkills || [], _note: 'Mock: skills-as-evidence.' };
        break;
      }
      case 'talentos_list_captured_jobs': {
        const state = await api.getDebugState();
        result = { capturedJobs: (state as any)?.extensionCapturedJobs || [] };
        break;
      }
      // ── Write tools ──
      case 'talentos_create_candidate':
        if (dryRun) { result = { dryRun: true, wouldCreate: { name: args.name, email: args.email } }; break; }
        logAudit('create_candidate', `name=${args.name}`, 'mcp-client');
        result = { created: true, id: 'cand_' + Date.now(), name: args.name, _note: 'Mock: saved. Production: INSERT.' };
        break;
      case 'talentos_update_candidate':
        if (dryRun) { result = { dryRun: true, wouldUpdate: { id: args.id } }; break; }
        logAudit('update_candidate', `id=${args.id}`, 'mcp-client');
        result = { updated: true, id: args.id, _note: 'Mock: updated. Production: UPDATE.' };
        break;
      case 'talentos_create_job':
        if (dryRun) { result = { dryRun: true, wouldCreate: { title: args.title, company: args.company } }; break; }
        logAudit('create_job', `title=${args.title}`, 'mcp-client');
        result = { created: true, id: 'job_' + Date.now(), title: args.title, _note: 'Mock: saved. Production: INSERT.' };
        break;
      case 'talentos_update_job':
        if (dryRun) { result = { dryRun: true, wouldUpdate: { id: args.id } }; break; }
        logAudit('update_job', `id=${args.id}`, 'mcp-client');
        result = { updated: true, id: args.id, _note: 'Mock: updated. Production: UPDATE.' };
        break;
      case 'talentos_create_application':
        if (dryRun) { result = { dryRun: true, wouldCreate: { candidateId: args.candidateId, jobId: args.jobId } }; break; }
        logAudit('create_application', `candidate=${args.candidateId}`, 'mcp-client');
        result = { created: true, id: 'app_' + Date.now(), _note: 'Mock: saved. Production: INSERT.' };
        break;
      case 'talentos_update_application':
        if (dryRun) { result = { dryRun: true, wouldUpdate: { id: args.id } }; break; }
        logAudit('update_application', `id=${args.id}`, 'mcp-client');
        result = { updated: true, id: args.id, _note: 'Mock: updated. Production: UPDATE.' };
        break;
      case 'talentos_approve_application':
        if (dryRun) { result = { dryRun: true, wouldApprove: { id: args.id } }; break; }
        logAudit('approve_application', `id=${args.id}`, 'mcp-client');
        result = { approved: true, id: args.id, reviewStatus: 'approved', _note: 'Mock: approved. Production: UPDATE review_status.' };
        break;
      case 'talentos_add_evidence':
        if (dryRun) { result = { dryRun: true, wouldAdd: { candidateId: args.candidateId, title: args.title } }; break; }
        logAudit('add_evidence', `candidate=${args.candidateId}`, 'mcp-client');
        result = { created: true, id: 'ev_' + Date.now(), sourceType: args.sourceType, title: args.title, _note: 'Mock: saved. Production: INSERT into candidate_evidence.' };
        break;
      case 'talentos_capture_job':
        if (dryRun) { result = { dryRun: true, wouldCapture: { title: args.title, applyUrl: args.applyUrl } }; break; }
        try { result = await api.captureJob({ title: args.title, applyUrl: args.applyUrl, jdText: args.jdText, company: args.company, location: args.location, salary: args.salary, atsDetected: args.atsDetected }); } catch { result = { captured: true, id: 'cap_' + Date.now(), _note: 'Mock: captured. Production: POST /capture-job.' }; }
        break;
      case 'talentos_promote_job':
        if (dryRun) { result = { dryRun: true, wouldPromote: { capturedJobId: args.capturedJobId } }; break; }
        logAudit('promote_job', `capturedJobId=${args.capturedJobId}`, 'mcp-client');
        result = { promoted: true, jobId: 'job_' + Date.now(), capturedJobId: args.capturedJobId, _note: 'Mock: promoted. Production: UPDATE extension_captured_jobs + INSERT jobs.' };
        break;
      // ── Delete tools (gated via safety check above) ──
      case 'talentos_delete_candidate':
      case 'talentos_delete_job':
      case 'talentos_delete_application':
      case 'talentos_delete_evidence':
        if (dryRun) { result = { dryRun: true, wouldDelete: { id: args.id, type: call.name.replace('talentos_delete_', '') } }; break; }
        logAudit(call.name.replace('talentos_', ''), `id=${args.id}`, 'mcp-client');
        result = { deleted: true, id: args.id, type: call.name.replace('talentos_delete_', ''), _note: 'Mock: deleted. Production: DELETE with CASCADE.' };
        break;
      // ── Admin ──
      case 'talentos_get_stats':
        result = { candidates: 1, jobs: 1, applications: 1, evidence: 6, capturedJobs: 0, _note: 'Mock seed stats. Production: SELECT COUNT(*).' };
        break;
      case 'talentos_get_debug_state':
        result = await api.getDebugState();
        break;
      default:
        return { content: [{ type: 'text', text: JSON.stringify({ error: `Tool not implemented: ${call.name}` }) }] };
    }

    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (err: any) {
    return { content: [{ type: 'text', text: JSON.stringify({ error: err.message || 'Tool execution failed', code: err.code || 'unknown' }) }] };
  }
}
