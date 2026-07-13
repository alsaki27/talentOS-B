import { requireProfile, getNextQueueItem, getAdaptersManifest, detectATS } from '@talentos/shared';
import { ProfileGateError, ApiError } from '@talentos/shared';

function friendlyError(err: unknown): string {
  if (err instanceof ProfileGateError) {
    switch (err.type) {
      case 'NO_MARKER': return 'No candidate profile set up. Open extension options to set your candidate ID.';
      case 'MALFORMED_MARKER': return 'Your candidate profile appears corrupted. Please re-enter your candidate ID in the extension options.';
      case 'CANDIDATE_MISMATCH': return 'Wrong candidate profile loaded. Check your candidate ID in extension options.';
    }
  }
  if (err instanceof ApiError) {
    if (err.code === 'queue_empty') return 'No pending applications in your queue.';
    if (err.code === 'adapter_expired') return 'The ATS adapter is outdated. Please update the extension.';
    return `${err.code}: ${err.message}`;
  }
  return String(err);
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  try {
    const candidateId = await requireProfile();

    // Show initial status
    await injectMessage(tab.id, 'loading', 'Loading your next application...');

    const queueResult = await getNextQueueItem(candidateId);
    const ticket = queueResult.ticket;

    const manifest = await getAdaptersManifest();
    let atsName: string | null = null;
    try { atsName = detectATS(new URL(ticket.applyUrl).hostname); } catch { atsName = null; }

    if (!atsName) {
      await injectMessage(tab.id, 'error', `Could not detect the ATS for ${ticket.company}. Navigate to the application page and try again.`);
      return;
    }

    const adapterEntry = manifest.adapters.find((a) => a.name === atsName);
    if (!adapterEntry) {
      await injectMessage(tab.id, 'error', `No form adapter available for ${atsName}. Supported ATS: ${manifest.adapters.map(a => a.name).join(', ')}.`);
      return;
    }
    if (adapterEntry.maturity === 'draft') {
      await injectMessage(tab.id, 'error', `The ${atsName} form adapter hasn't been verified yet. Please fill this application manually.`);
      return;
    }

    // Patch data into page for copilot script
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (data: unknown, name: string) => {
        (window as any).__TALENTOS_COPILOT_DATA__ = { ticket: data, adapterName: name };
      },
      args: [ticket, atsName],
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['copilot.js'],
    });

  } catch (err) {
    const msg = friendlyError(err);
    try {
      await injectMessage(tab.id, 'error', msg);
    } catch {
      console.error('[B5]', err);
    }
  }
});

async function injectMessage(tabId: number, type: 'loading' | 'error', msg: string): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (message: string, messageType: string) => {
      const id = 'talentos-msg';
      const old = document.getElementById(id);
      if (old) old.remove();

      const el = document.createElement('div');
      el.id = id;
      el.textContent = message;
      const color = messageType === 'loading' ? '#3d8f6a' : '#ef4444';
      Object.assign(el.style, {
        position: 'fixed', top: '16px', right: '16px', zIndex: '2147483646',
        background: '#18181b', color, border: `1px solid ${color}33`, padding: '12px 18px',
        borderRadius: '8px', fontFamily: 'system-ui, sans-serif', fontSize: '13px',
        boxShadow: '0 4px 16px rgba(0,0,0,.5)', maxWidth: '360px',
      });
      document.body.appendChild(el);

      if (messageType === 'error') {
        setTimeout(() => {
          el.style.transition = 'opacity .3s';
          el.style.opacity = '0';
          setTimeout(() => el.remove(), 300);
        }, 5000);
      }
    },
    args: [msg, type],
  });
}
