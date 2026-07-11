// B1: Content script for job capture
// Runs on job posting pages, captures data on user click

const TAlentos_API = process.env.REACT_APP_TALENTOS_API || 'http://localhost:3000/api/extension/v1';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureJob') {
    const jobData = extractJobData();
    sendResponse({ success: true, data: jobData });
  }
});

function extractJobData() {
  return {
    title: document.querySelector('h1')?.textContent?.trim() || '',
    company: document.querySelector('[data-company], .company')?.textContent?.trim() || '',
    location: document.querySelector('[data-location], .location')?.textContent?.trim() || '',
    jdText: document.body.innerText,
    applyUrl: window.location.href,
    sourceSite: new URL(window.location.href).hostname,
    salary: document.querySelector('[data-salary], .salary')?.textContent?.trim() || null,
    atsDetected: detectATS(window.location.href),
    screenshot: null // populated by background script
  };
}

function detectATS(url: string): string {
  const domain = url.toLowerCase();
  if (domain.includes('greenhouse')) return 'Greenhouse';
  if (domain.includes('lever')) return 'Lever';
  if (domain.includes('workday')) return 'Workday';
  if (domain.includes('icims')) return 'iCIMS';
  if (domain.includes('taleo')) return 'Taleo';
  if (domain.includes('bamboohr')) return 'BambooHR';
  return 'Unknown';
}
