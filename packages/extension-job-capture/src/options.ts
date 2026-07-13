import { setApiKey, setApiBase, setCandidateId, getApiKey, getApiBase, getCandidateId } from '@talentos/shared';

const HISTORY_KEY = 'talentos_capture_history';
const MAX_HISTORY = 20;

interface CaptureEntry { title: string; company: string; site: string; ats: string; time: string; jobId: string }

const statusBar = document.getElementById('statusBar')!;
const testBtn = document.getElementById('testBtn')!;
const historyList = document.getElementById('historyList')!;
const clearHistoryBtn = document.getElementById('clearHistoryBtn')!;

function showStatus(msg: string, type: 'ok' | 'err' | 'info'): void {
  statusBar.textContent = msg;
  statusBar.className = `status ${type}`;
  statusBar.classList.remove('hidden');
  setTimeout(() => statusBar.classList.add('hidden'), 4000);
}

async function testConnection(): Promise<void> {
  const base = (document.getElementById('apiBase') as HTMLInputElement).value.trim() || 'http://localhost:4114';
  const key = (document.getElementById('apiKey') as HTMLInputElement).value.trim();
  if (!key || !key.startsWith('tos_')) { showStatus('Enter a valid API key (starts with tos_)', 'err'); return; }
  testBtn.innerHTML = '<span class="spinner"></span>Testing...';
  testBtn.className = 'btn-test testing';
  try {
    const res = await fetch(`${base}/adapters/manifest`, { headers: { 'Authorization': `Bearer ${key}`, 'X-TalentOS-Client': 'options-test/1.0' } });
    if (res.ok) { showStatus('Connected! Server responded successfully.', 'ok'); testBtn.className = 'btn-test'; }
    else { const data = await res.json().catch(() => ({})); showStatus(`Server error: ${(data as any)?.error?.message || res.status}`, 'err'); testBtn.className = 'btn-test error'; }
  } catch { showStatus('Connection failed. Is the server running?', 'err'); testBtn.className = 'btn-test error'; }
  testBtn.textContent = 'Test Connection';
}

export async function addToHistory(entry: CaptureEntry): Promise<void> {
  const stored = await chrome.storage.local.get(HISTORY_KEY);
  const history: CaptureEntry[] = stored[HISTORY_KEY] || [];
  history.unshift(entry);
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  await chrome.storage.local.set({ [HISTORY_KEY]: history });
}

async function renderHistory(): Promise<void> {
  const stored = await chrome.storage.local.get(HISTORY_KEY);
  const history: CaptureEntry[] = stored[HISTORY_KEY] || [];
  if (history.length === 0) {
    historyList.innerHTML = '<div class="empty-hint">No jobs captured yet. Click the extension icon on a job posting.</div>';
    return;
  }
  historyList.innerHTML = history.map(e => `
    <div class="capture-item">
      <div>
        <div class="title">${esc(e.title)}</div>
        <div class="site">${esc(e.company || e.site)} · ${e.ats}</div>
      </div>
      <div class="time">${e.time.slice(0,16).replace('T',' ')}</div>
    </div>
  `).join('');
}

async function clearHistory(): Promise<void> {
  await chrome.storage.local.remove(HISTORY_KEY);
  await renderHistory();
}

async function saveSettings(): Promise<void> {
  const base = (document.getElementById('apiBase') as HTMLInputElement).value.trim() || 'http://localhost:4114';
  const key = (document.getElementById('apiKey') as HTMLInputElement).value.trim();
  const candidateId = (document.getElementById('candidateId') as HTMLInputElement).value.trim();
  if (!key) { showStatus('API key is required', 'err'); return; }
  if (!candidateId) { showStatus('Candidate ID is required', 'err'); return; }
  await setApiBase(base); await setApiKey(key); await setCandidateId(candidateId);
  showStatus('Settings saved', 'ok');
}

async function clearSettings(): Promise<void> {
  await setApiKey(''); await setCandidateId('');
  (document.getElementById('apiKey') as HTMLInputElement).value = '';
  (document.getElementById('candidateId') as HTMLInputElement).value = '';
  showStatus('Settings cleared', 'info');
}

async function loadSettings(): Promise<void> {
  (document.getElementById('apiBase') as HTMLInputElement).value = await getApiBase();
  (document.getElementById('apiKey') as HTMLInputElement).value = await getApiKey();
  (document.getElementById('candidateId') as HTMLInputElement).value = await getCandidateId();
}

function esc(s: string): string { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

testBtn.addEventListener('click', testConnection);
document.getElementById('saveBtn')!.addEventListener('click', saveSettings);
document.getElementById('clearBtn')!.addEventListener('click', clearSettings);
clearHistoryBtn.addEventListener('click', clearHistory);
loadSettings();
renderHistory();
