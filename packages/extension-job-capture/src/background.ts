// B1: Background script - handles API calls to TalentOS

const API_KEY = process.env.TALENTOS_EXTENSION_KEY || '';
const API_BASE = 'http://localhost:3000/api/extension/v1';

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  
  chrome.tabs.sendMessage(tab.id, { action: 'captureJob' }, async (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error:', chrome.runtime.lastError);
      return;
    }
    
    try {
      const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId);
      response.data.screenshot = screenshot;
      
      await postJobCapture(response.data);
      chrome.action.setBadgeText({ text: '✓', tabId: tab.id });
      setTimeout(() => chrome.action.setBadgeText({ text: '', tabId: tab.id }), 2000);
    } catch (error) {
      console.error('Capture failed:', error);
    }
  });
});

async function postJobCapture(jobData: any) {
  const res = await fetch(`${API_BASE}/capture-job`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify(jobData)
  });
  
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
