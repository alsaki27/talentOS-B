const API_BASE = process.env.REACT_APP_TALENTOS_API || 'http://localhost:3000/api/extension/v1';
export async function apiCall(endpoint: string, method: string, body?: any, token?: string) {
  const headers: any = {'Content-Type': 'application/json'};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${endpoint}`, {method, headers, body: body ? JSON.stringify(body) : undefined});
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}
export async function captureJob(jobData: any, token: string) { return apiCall('/capture-job', 'POST', jobData, token); }
export async function getReadinessScore(appId: string, token: string) { return apiCall(`/readiness/${appId}`, 'GET', undefined, token); }
export async function getNextQueueItem(token: string) { return apiCall('/queue/next', 'GET', undefined, token); }
export async function postEvidence(data: any, token: string) { return apiCall('/evidence', 'POST', data, token); }
export async function getAdaptersManifest(token: string) { return apiCall('/adapters/manifest', 'GET', undefined, token); }
