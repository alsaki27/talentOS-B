import { setApiKey, setApiBase, setCandidateId, getApiKey, getApiBase, getCandidateId } from '@talentos/shared';

const statusBar = document.getElementById('statusBar')!;
const testBtn = document.getElementById('testBtn')!;

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

testBtn!.addEventListener('click', testConnection);
document.getElementById('saveBtn')!.addEventListener('click', saveSettings);
document.getElementById('clearBtn')!.addEventListener('click', clearSettings);
loadSettings();
