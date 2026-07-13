import { detectATS } from '@talentos/shared';

function main(): void {
  const jobData = extractJobData();

  insertToast('Capturing job posting...', '#3d8f6a', 'capturing');

  chrome.runtime.sendMessage(
    { action: 'captureJob', data: jobData },
    (response) => {
      if (chrome.runtime.lastError) {
        showResult('Connection failed. Is the extension loaded?', '#ef4444');
        return;
      }
      if (response?.success && !response.duplicate) {
        showResult('Job saved!', '#22c55e');
        showPreview(jobData, response.jobId);
      } else if (response?.duplicate) {
        showResult('Already captured', '#f59e0b');
      } else {
        showResult(response?.error || 'Capture failed', '#ef4444');
      }
    }
  );
}

function extractJobData() {
  const title = document.querySelector('h1')?.textContent?.trim() || document.title || 'Unknown Position';
  const company =
    document.querySelector('[data-company], .company, .employer-name, meta[property="og:site_name"]')?.getAttribute('content') ||
    document.querySelector('[data-company], .company, .employer-name')?.textContent?.trim() || '';
  const location = document.querySelector('[data-location], .location, .job-location')?.textContent?.trim() || '';

  const jdEl = document.querySelector('[data-job-description], .job-description, .description, #job-description');
  const jdText = jdEl ? (jdEl as HTMLElement).innerText.trim() : document.body.innerText.slice(0, 10000);

  return {
    title,
    company,
    location,
    applyUrl: window.location.href,
    jdText,
    sourceSite: window.location.hostname,
    salary: document.querySelector('[data-salary], .salary, .compensation')?.textContent?.trim() || '',
    atsDetected: detectATS(window.location.hostname) || 'Unknown',
    screenshotUrl: null as string | null,
  };
}

// ── Inline UI ──

function insertToast(msg: string, color: string, id: string): void {
  const el = document.createElement('div');
  el.id = `talentos-toast-${id}`;
  el.textContent = msg;
  Object.assign(el.style, {
    position: 'fixed', top: '16px', right: '16px', zIndex: '2147483646',
    background: color, color: '#fff', padding: '10px 20px', borderRadius: '8px',
    fontFamily: 'system-ui, sans-serif', fontSize: '14px', fontWeight: '600',
    boxShadow: '0 4px 16px rgba(0,0,0,.3)', opacity: '0', transform: 'translateY(-8px)',
    transition: 'all .2s ease',
  });
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });
}

function showResult(msg: string, color: string): void {
  const existing = document.getElementById('talentos-toast-capturing');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.id = 'talentos-toast-result';
  el.textContent = msg;
  Object.assign(el.style, {
    position: 'fixed', top: '16px', right: '16px', zIndex: '2147483646',
    background: color, color: '#fff', padding: '10px 20px', borderRadius: '8px',
    fontFamily: 'system-ui, sans-serif', fontSize: '14px', fontWeight: '600',
    boxShadow: '0 4px 16px rgba(0,0,0,.3)',
  });
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .3s ease';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 2500);
}

function showPreview(data: Record<string, unknown>, jobId: string): void {
  const existing = document.getElementById('talentos-preview');
  if (existing) existing.remove();

  const fields = [
    ['Position', data.title],
    ['Company', data.company],
    ['Location', data.location],
    ['Salary', data.salary],
    ['ATS Detected', data.atsDetected],
    ['Job ID', jobId],
  ].filter(([, v]) => v && String(v).trim());

  const rows = fields
    .map(([label, value]) => `<div style="display:flex;gap:8px;padding:4px 0;border-bottom:1px solid #27272a;"><span style="color:#a1a1aa;min-width:100px;font-size:11px;">${esc(String(label))}</span><span style="color:#f4f4f5;font-size:12px;">${esc(String(value)).slice(0, 60)}</span></div>`)
    .join('');

  const host = document.createElement('div');
  host.id = 'talentos-preview';
  host.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:2147483646;font-family:system-ui,sans-serif;';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      .preview { background:#18181b;color:#f4f4f5;border-radius:10px;padding:16px;box-shadow:0 4px 24px rgba(0,0,0,.5);min-width:300px;max-width:400px;animation:fadeIn .2s ease; }
      @keyframes fadeIn { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }
      .title { font-weight:700;font-size:14px;color:#3d8f6a;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center; }
      .close { background:none;border:none;color:#52525b;cursor:pointer;font-size:16px;padding:0 4px; }
      .close:hover { color:#f4f4f5; }
    </style>
    <div class="preview">
      <div class="title">
        <span>Captured Details</span>
        <button class="close" id="talentos-close-preview">✕</button>
      </div>
      ${rows}
    </div>
  `;

  const closeBtn = shadow.getElementById('talentos-close-preview');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      host.style.transition = 'opacity .2s ease';
      host.style.opacity = '0';
      setTimeout(() => host.remove(), 200);
    });
  }

  // Auto-dismiss after 12 seconds
  setTimeout(() => {
    if (document.getElementById('talentos-preview')) {
      host.style.transition = 'opacity .3s ease';
      host.style.opacity = '0';
      setTimeout(() => host.remove(), 300);
    }
  }, 12000);
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
