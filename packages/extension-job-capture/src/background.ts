import { captureJob, postEvidence } from '@talentos/shared';

const HISTORY_KEY = 'talentos_capture_history';
const MAX_HISTORY = 20;

async function saveCaptureHistory(data: any, jobId: string): Promise<void> {
  const stored = await chrome.storage.local.get(HISTORY_KEY);
  const history: Array<{ title: string; company: string; site: string; ats: string; time: string; jobId: string }> = stored[HISTORY_KEY] || [];
  history.unshift({
    title: data.title || 'Unknown',
    company: data.company || '',
    site: data.sourceSite || '',
    ats: data.atsDetected || 'Unknown',
    time: new Date().toISOString(),
    jobId,
  });
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  await chrome.storage.local.set({ [HISTORY_KEY]: history });
}

let badgeTimer: ReturnType<typeof setTimeout> | null = null;

function setBadge(text: string, color: string, tabId: number): void {
  if (badgeTimer) clearTimeout(badgeTimer);
  chrome.action.setBadgeText({ text, tabId });
  chrome.action.setBadgeBackgroundColor({ color, tabId });
  badgeTimer = setTimeout(() => {
    chrome.action.setBadgeText({ text: '', tabId });
    badgeTimer = null;
  }, 3000);
}

// Persistent message listener for captureJob
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action !== 'captureJob' || !sender.tab?.id) return false;

  const tabId = sender.tab.id;

  (async () => {
    try {
      const result = await captureJob(message.data);
      if (result.duplicate) {
        setBadge('DUP', '#f59e0b', tabId);
        sendResponse({ success: true, duplicate: true, jobId: result.jobId });
      } else {
        setBadge('OK', '#22c55e', tabId);
        saveCaptureHistory(message.data, result.jobId);
        sendResponse({ success: true, duplicate: false, jobId: result.jobId });
      }
    } catch (err: any) {
      console.error('[B1] Capture failed:', err);
      setBadge('ERR', '#ef4444', tabId);
      sendResponse({ success: false, error: err.message || 'Unknown error' });
    }
  })();

  return true; // keep channel open for async response
});

// B6: evidence capture listener for application submissions
chrome.runtime.onMessage.addListener(async (message, sender) => {
  if (message.action === 'captureEvidence' && sender.tab?.id) {
    try {
      const screenshot = await chrome.tabs.captureVisibleTab(sender.tab.id, { format: 'png' });
      await postEvidence({
        applicationId: message.data.applicationId,
        screenshotUrl: screenshot,
        confirmationScrape: { url: message.data.url, title: message.data.title },
      });
    } catch (err) {
      console.error('[B6] Evidence capture failed:', err);
    }
  }
});
