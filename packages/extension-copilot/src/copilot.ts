import { getAdapter, fillFields } from '@talentos/ats-adapters';
import { installEvidenceListener } from '@talentos/shared';
import type { ATSAdapter, FillResult, ProfileValues } from '@talentos/ats-adapters';

interface TicketData {
  applicationId: string;
  jobTitle: string;
  company: string;
  applyUrl: string;
  profile: ProfileValues;
}

interface CopilotPayload {
  ticket: TicketData;
  adapterName: string;
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Full Name',
  email: 'Email',
  phone: 'Phone',
  location: 'Location',
  workAuth: 'Work Authorization',
  linkedin: 'LinkedIn',
  portfolio: 'Portfolio',
};

const PROFILE_MAP: Record<string, keyof ProfileValues> = {
  name: 'name',
  email: 'email',
  phone: 'phone',
  location: 'location',
  workAuth: 'workAuthorization',
  linkedin: 'linkedin',
  portfolio: 'portfolio',
};

function main(): void {
  const payload = (window as any).__TALENTOS_COPILOT_DATA__ as CopilotPayload | undefined;
  if (!payload) {
    showError('No copilot data. Click the extension icon on an ATS application page.');
    return;
  }

  const { ticket, adapterName } = payload;
  const adapter = getAdapter(adapterName);
  if (!adapter) {
    showError(`No adapter found for "${adapterName}".`);
    return;
  }

  // 1. Show summary card
  showSummary(ticket, adapterName, adapter, () => {
    // 2. Fill fields
    const results = fillFields(adapter, ticket.profile);
    for (const r of results) {
      if (r.status === 'filled' || r.status === 'uncertain') {
        applyFill(r, ticket.profile);
      }
    }

    // 3. Install evidence listener
    installEvidenceListener(ticket.applicationId);

    // 4. Show review panel
    showReviewPanel(ticket, adapterName, adapter, results);
  });
}

// ── Fill DOM ──
function applyFill(result: FillResult, profile: ProfileValues): void {
  if (!result.selector || !result.value) return;
  const key = PROFILE_MAP[result.field];
  const value = key ? profile[key] : null;
  if (!value) return;

  try {
    const el = document.querySelector(result.selector);
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.value = String(value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (el instanceof HTMLSelectElement) {
      const option = Array.from(el.options).find((o) =>
        o.text.toLowerCase().includes(String(value).toLowerCase())
      );
      if (option) {
        el.value = option.value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  } catch { /* best-effort */ }
}

// ── Summary Panel ──
function showSummary(ticket: TicketData, adapterName: string, adapter: ATSAdapter, onConfirm: () => void): void {
  const host = createHost('talentos-summary');

  const fieldCount = Object.keys(adapter.selectors).length;
  const stubCount = Object.values(adapter.selectors).filter((s) => !s).length;

  const shadow = host.attachShadow({ mode: 'closed' });
  shadow.innerHTML = `
    <style>
      .card { background:#18181b;color:#f4f4f5;border-radius:10px;padding:20px;box-shadow:0 4px 24px rgba(0,0,0,.5);min-width:320px;max-width:400px;font-family:system-ui,sans-serif;animation:in .2s ease; }
      @keyframes in { from{opacity:0;transform:translateY(8px);} }
      .title { font-size:16px;font-weight:700;color:#3d8f6a;margin-bottom:4px; }
      .sub { font-size:13px;color:#a1a1aa;margin-bottom:16px; }
      .row { display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #27272a;font-size:12px; }
      .row .l { color:#71717a; }
      .row .v { color:#f4f4f5;font-weight:500; }
      .actions { display:flex;gap:8px;margin-top:16px; }
      button { padding:8px 16px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;border:none; }
      .btn-fill { background:#3d8f6a;color:#18181b;flex:1; }
      .btn-fill:hover { background:#4ade80; }
      .btn-cancel { background:#27272a;color:#a1a1aa; }
      .btn-cancel:hover { color:#f4f4f5; }
      .note { margin-top:12px;font-size:11px;color:#52525b;text-align:center; }
    </style>
    <div class="card">
      <div class="title">${esc(ticket.jobTitle)}</div>
      <div class="sub">${esc(ticket.company)} · ${adapterName} · ${fieldCount} fields</div>
      <div class="row"><span class="l">Candidate</span><span class="v">${esc(ticket.profile.name)}</span></div>
      <div class="row"><span class="l">Email</span><span class="v">${esc(ticket.profile.email)}</span></div>
      <div class="row"><span class="l">Adapter</span><span class="v">${adapterName} (${adapter.maturity})</span></div>
      ${stubCount > 0 ? `<div style="margin-top:8px;padding:6px 8px;background:#422006;border-radius:6px;font-size:11px;color:#fde68a;">${stubCount} field(s) have no selectors — will be marked unknown.</div>` : ''}
      <div class="actions">
        <button class="btn-cancel" id="copilot-cancel">Cancel</button>
        <button class="btn-fill" id="copilot-fill">Fill Application</button>
      </div>
      <div class="note">Fields will be filled for review. You must manually submit.</div>
    </div>
  `;

  shadow.getElementById('copilot-fill')?.addEventListener('click', () => { host.remove(); onConfirm(); });
  shadow.getElementById('copilot-cancel')?.addEventListener('click', () => host.remove());
}

// ── Review Panel ──
function showReviewPanel(ticket: TicketData, adapterName: string, adapter: ATSAdapter, results: FillResult[]): void {
  const host = createHost('talentos-review');

  const filledCount = results.filter((r) => r.status === 'filled').length;
  const uncertainCount = results.filter((r) => r.status === 'uncertain').length;
  const unknownCount = results.filter((r) => r.status === 'unknown').length;
  const hasIssues = uncertainCount > 0 || unknownCount > 0;

  const rows = results.map((r) => {
    const label = FIELD_LABELS[r.field] || r.field;
    const statusIcon = r.status === 'filled' ? '✓' : r.status === 'uncertain' ? '~' : '✗';
    const statusClass = r.status;
    const displayValue = r.status === 'unknown' ? '—' : String(r.value || '').slice(0, 36);
    return `<div class="row">
      <span class="icon ${statusClass}">${statusIcon}</span>
      <span class="field">${esc(label)}</span>
      <span class="value">${esc(displayValue)}</span>
    </div>`;
  }).join('');

  const shadow = host.attachShadow({ mode: 'closed' });
  shadow.innerHTML = `
    <style>
      .card { background:#18181b;color:#f4f4f5;border-radius:10px;padding:16px;box-shadow:0 4px 24px rgba(0,0,0,.5);min-width:360px;max-width:440px;max-height:80vh;overflow-y:auto;font-family:system-ui,sans-serif;animation:in .2s ease; }
      @keyframes in { from{opacity:0;transform:translateY(8px);} }
      .header { display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;border-bottom:1px solid #3f3f46;padding-bottom:8px; }
      .title { font-weight:700;font-size:15px;color:#3d8f6a; }
      .sub { font-size:12px;color:#a1a1aa;margin-top:2px; }
      .close { background:none;border:none;color:#52525b;cursor:pointer;font-size:16px;padding:2px 6px;border-radius:4px; }
      .close:hover { color:#f4f4f5;background:#27272a; }
      .stats { display:flex;gap:12px;margin:10px 0; }
      .stat { font-size:12px;color:#a1a1aa; }
      .num { font-weight:700; }
      .num.filled { color:#22c55e; }
      .num.uncertain { color:#f59e0b; }
      .num.unknown { color:#ef4444; }
      .row { display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #27272a;font-size:12px; }
      .icon { width:16px;text-align:center;font-size:11px;font-weight:700; }
      .icon.filled { color:#22c55e; }
      .icon.uncertain { color:#f59e0b; }
      .icon.unknown { color:#ef4444; }
      .field { flex:1;color:#d4d4d8;font-weight:500; }
      .value { color:#a1a1aa;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
      .warning { margin-top:12px;padding:8px 12px;background:#422006;border-radius:6px;color:#fde68a;font-size:11px; }
      .footer { margin-top:12px;font-size:11px;color:#52525b;text-align:center; }
    </style>
    <div class="card">
      <div class="header">
        <div>
          <div class="title">${esc(ticket.jobTitle)}</div>
          <div class="sub">${esc(ticket.company)} · ${adapterName}</div>
        </div>
        <button class="close" id="review-close">✕</button>
      </div>
      <div class="stats">
        <span class="stat"><span class="num filled">${filledCount}</span> filled</span>
        <span class="stat"><span class="num uncertain">${uncertainCount}</span> uncertain</span>
        <span class="stat"><span class="num unknown">${unknownCount}</span> unknown</span>
      </div>
      ${rows}
      ${hasIssues ? '<div class="warning">Review uncertain and unknown fields before submitting. The copilot never submits for you.</div>' : '<div class="footer">All fields filled. Review and submit manually when ready.</div>'}
      ${!hasIssues ? '' : '<div class="footer">Review the form and click submit when ready. This panel can be closed.</div>'}
    </div>
  `;

  shadow.getElementById('review-close')?.addEventListener('click', () => {
    host.style.transition = 'opacity .2s';
    host.style.opacity = '0';
    setTimeout(() => host.remove(), 200);
  });
}

// ── Error display ──
function showError(msg: string): void {
  const host = createHost('talentos-error');
  const shadow = host.attachShadow({ mode: 'closed' });
  shadow.innerHTML = `
    <style>
      .card { background:#18181b;color:#f4f4f5;border-radius:10px;padding:16px;box-shadow:0 4px 24px rgba(0,0,0,.5);min-width:300px;max-width:400px;font-family:system-ui,sans-serif;animation:in .2s ease; }
      @keyframes in { from{opacity:0;transform:translateY(8px);} }
      .title { font-weight:600;color:#ef4444;margin-bottom:8px;font-size:14px; }
      .msg { color:#a1a1aa;font-size:13px;line-height:1.4; }
      .close { background:none;border:none;color:#52525b;cursor:pointer;font-size:16px;padding:2px 6px;border-radius:4px;float:right; }
      .close:hover { color:#f4f4f5;background:#27272a; }
    </style>
    <div class="card">
      <button class="close" id="err-close">✕</button>
      <div class="title">Copilot</div>
      <div class="msg">${esc(msg)}</div>
    </div>
  `;
  shadow.getElementById('err-close')?.addEventListener('click', () => {
    host.style.transition = 'opacity .2s';
    host.style.opacity = '0';
    setTimeout(() => host.remove(), 200);
  });
}

// ── Helpers ──
function createHost(id: string): HTMLDivElement {
  const old = document.getElementById(id);
  if (old) { old.style.transition = 'opacity .15s'; old.style.opacity = '0'; setTimeout(() => old.remove(), 150); }
  const h = document.createElement('div');
  h.id = id;
  h.style.cssText = 'position:fixed;top:16px;right:16px;z-index:2147483646;';
  document.body.appendChild(h);
  return h;
}

function esc(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
