import { previewReadiness } from '@talentos/shared';

function main(): void {
  const jdText = extractJD();
  if (!jdText) {
    showToast('Could not extract job description.', '#ef4444');
    return;
  }

  showToast('Analyzing readiness...', '#3d8f6a');

  previewReadiness({ jdText })
    .then((result) => {
      dismissToast();
      renderPanel(result);
    })
    .catch((err) => {
      dismissToast();
      showToast(err.message || 'Readiness check failed', '#ef4444');
    });
}

function extractJD(): string {
  const jdEl = document.querySelector('[data-job-description], .job-description, .description, #job-description');
  if (jdEl) return (jdEl as HTMLElement).innerText.trim();
  const body = document.body.innerText;
  return body.length > 500 ? body : '';
}

// ── Toast ──
let toastEl: HTMLElement | null = null;

function showToast(msg: string, color: string): void {
  dismissToast();
  toastEl = document.createElement('div');
  toastEl.id = 'talentos-qa-toast';
  toastEl.textContent = msg;
  Object.assign(toastEl.style, {
    position: 'fixed', top: '16px', right: '16px', zIndex: '2147483646',
    background: color, color: '#fff', padding: '10px 18px', borderRadius: '8px',
    fontFamily: 'system-ui, sans-serif', fontSize: '13px', fontWeight: '600',
    boxShadow: '0 4px 16px rgba(0,0,0,.3)',
  });
  document.body.appendChild(toastEl);
}

function dismissToast(): void {
  if (toastEl) { toastEl.remove(); toastEl = null; }
}

// ── Panel ──
function renderPanel(result: { required: string[]; matched: string[]; missing: string[]; flagged: string[]; score: number; threshold: number }): void {
  removePanel();

  const passed = result.score >= result.threshold;
  const scoreColor = passed ? '#22c55e' : result.score >= 40 ? '#f59e0b' : '#ef4444';
  const barWidth = Math.min(100, result.score);
  const statusLabel = passed ? 'Ready' : result.score >= 40 ? 'Partial' : 'Low';

  const flaggedSection = result.flagged.length
    ? `<div class="section">
        <div class="section-hdr"><span class="section-title">Flagged Claims</span><span class="section-count">${result.flagged.length}</span></div>
        <div>${result.flagged.map(s => `<span class="tag flagged">${esc(s)} <button class="add-ev" data-skill="${esc(s)}">+ evidence</button></span>`).join('')}</div>
      </div>`
    : `<div class="section"><div class="section-hdr"><span class="section-title">Flagged</span><span class="section-count">0</span></div><div class="empty">no unverified claims</div></div>`;

  const missingSection = result.missing.length
    ? `<div class="section">
        <div class="section-hdr"><span class="section-title">Missing</span><span class="section-count">${result.missing.length}</span></div>
        <div>${result.missing.map(s => `<span class="tag missing">${esc(s)} <button class="add-ev" data-skill="${esc(s)}">+ note</button></span>`).join('')}</div>
      </div>`
    : `<div class="section"><div class="section-hdr"><span class="section-title">Missing</span><span class="section-count">0</span></div><div class="empty">nothing missing</div></div>`;

  const host = document.createElement('div');
  host.id = 'talentos-qa-panel';
  host.style.cssText = 'position:fixed;top:16px;right:16px;z-index:2147483646;font-family:system-ui,sans-serif;';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'closed' });
  shadow.innerHTML = `
    <style>
      .panel { background:#18181b;color:#f4f4f5;border-radius:10px;padding:16px;box-shadow:0 4px 24px rgba(0,0,0,.5);min-width:340px;max-width:400px;max-height:80vh;overflow-y:auto;animation:slideIn .2s ease; }
      @keyframes slideIn { from{opacity:0;transform:translateX(8px);} to{opacity:1;transform:translateX(0);} }
      .header { display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px; }
      .score-wrap { text-align:right; }
      .score { font-size:32px;font-weight:700;color:${scoreColor};line-height:1; }
      .score-label { font-size:11px;color:#a1a1aa;margin-top:2px; }
      .threshold { font-size:11px;color:#52525b; }
      .close { background:none;border:none;color:#52525b;cursor:pointer;font-size:16px;padding:2px 6px;border-radius:4px;line-height:1; }
      .close:hover { color:#f4f4f5;background:#27272a; }
      .bar-wrap { margin-bottom:14px; }
      .bar-bg { background:#3f3f46;border-radius:4px;height:8px;overflow:hidden;position:relative; }
      .bar-fg { background:${scoreColor};height:100%;width:${barWidth}%;border-radius:4px;transition:width .4s ease; }
      .bar-label { display:flex;justify-content:space-between;font-size:10px;color:#71717a;margin-top:4px; }
      .section { margin-bottom:10px; }
      .section-hdr { display:flex;justify-content:space-between;align-items:center;margin-bottom:4px; }
      .section-title { font-weight:600;font-size:11px;text-transform:uppercase;color:#a1a1aa; }
      .section-count { font-size:11px;background:#27272a;padding:1px 6px;border-radius:8px;color:#71717a; }
      .tag { display:inline-block;padding:2px 7px;border-radius:4px;font-size:11px;margin:2px; }
      .tag.matched { background:#166534;color:#bbf7d0; }
      .tag.missing { background:#7f1d1d;color:#fecaca; }
      .tag.flagged { background:#78350f;color:#fde68a; }
      .empty { color:#52525b;font-style:italic;font-size:12px; }
      .add-ev { background:none;border:1px solid currentColor;color:inherit;cursor:pointer;font-size:10px;padding:0 4px;border-radius:3px;margin-left:4px;opacity:.6; }
      .add-ev:hover { opacity:1; }
    </style>
    <div class="panel">
      <div class="header">
        <div>
          <div style="font-size:14px;font-weight:700;color:#3d8f6a;">Readiness</div>
          <div class="threshold">threshold: ${result.threshold}%</div>
        </div>
        <button class="close" id="qa-close">✕</button>
        <div class="score-wrap">
          <div class="score">${result.score}%</div>
          <div class="score-label">${statusLabel}</div>
        </div>
      </div>
      <div class="bar-wrap">
        <div class="bar-bg"><div class="bar-fg"></div></div>
        <div class="bar-label"><span>0%</span><span>${result.threshold}% pass</span><span>100%</span></div>
      </div>
      <div class="section">
        <div class="section-hdr"><span class="section-title">Matched</span><span class="section-count">${result.matched.length}</span></div>
        <div>${result.matched.length ? result.matched.map(s => `<span class="tag matched">${esc(s)}</span>`).join('') : '<span class="empty">no skills matched</span>'}</div>
      </div>
      ${missingSection}
      ${flaggedSection}
    </div>
  `;

  // Close button
  shadow.getElementById('qa-close')?.addEventListener('click', () => {
    host.style.transition = 'opacity .2s ease, transform .2s ease';
    host.style.opacity = '0';
    host.style.transform = 'translateX(8px)';
    setTimeout(() => host.remove(), 200);
  });

  // Evidence quick-add buttons
  shadow.querySelectorAll('.add-ev').forEach((btn) => {
    btn.addEventListener('click', () => {
      const skill = (btn as HTMLElement).dataset.skill || '';
      const note = prompt(`Add evidence note for "${skill}":`, `Demonstrated ${skill} in previous work`);
      if (note) {
        saveEvidenceNote(skill, note);
        (btn as HTMLElement).textContent = ' ✓ saved';
        (btn as HTMLElement).style.opacity = '1';
        (btn as HTMLElement).style.border = '1px solid #22c55e';
      }
    });
  });
}

function removePanel(): void {
  const existing = document.getElementById('talentos-qa-panel');
  if (existing) existing.remove();
}

// Evidence quick-add: saves to chrome.storage.local, aligned with TalentOS evidence model
async function saveEvidenceNote(skill: string, description: string): Promise<void> {
  const KEY = 'talentos_qa_evidence_notes';
  const stored = await chrome.storage.local.get(KEY);
  const notes: Array<{ skill: string; description: string; source_type: string; created_at: string }> = stored[KEY] || [];
  notes.unshift({
    skill,
    description,
    source_type: 'manual',
    created_at: new Date().toISOString(),
  });
  await chrome.storage.local.set({ [KEY]: notes.slice(0, 50) });
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
