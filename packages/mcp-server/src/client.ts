/**
 * TalentOS API client — wraps HTTP calls to the TalentOS A4 mock server
 * (or production /api/extension/v1 when Track A routes are live).
 *
 * For now, talks to the mock server on :4114 by default.
 * Set TALENTOS_API_BASE env var to point at production.
 */

const API_BASE = process.env.TALENTOS_API_BASE || 'http://localhost:4114';
const API_KEY = process.env.TALENTOS_API_KEY || 'tos_mcp_admin_000000000000000000000000';

interface ApiCallOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string>;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiCall<T>(path: string, options: ApiCallOptions = {}): Promise<T> {
  const { method = 'GET', body, params } = options;

  let url = `${API_BASE}${path}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
    'X-TalentOS-Client': 'mcp-server/1.0.0',
  };

  if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
    headers['Idempotency-Key'] = crypto.randomUUID();
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({})) as Record<string, unknown>;

  if (!res.ok) {
    const err = (data as any)?.error;
    throw new ApiError(
      res.status,
      err?.code || 'unknown',
      err?.message || `HTTP ${res.status}`,
      err?.details
    );
  }

  return data as T;
}

// ─── Convenience methods ───

export async function getCandidates(params?: Record<string, string>) {
  return apiCall<{ candidates: any[]; total: number }>('/candidates', { params });
}

export async function getCandidate(id: string) {
  return apiCall<any>(`/candidates/${id}`);
}

export async function getJobs(params?: Record<string, string>) {
  return apiCall<{ jobs: any[]; total: number }>('/jobs', { params });
}

export async function getJob(id: string) {
  return apiCall<any>(`/jobs/${id}`);
}

export async function getApplications(params?: Record<string, string>) {
  return apiCall<{ applications: any[]; total: number }>('/applications', { params });
}

export async function getApplication(id: string) {
  return apiCall<any>(`/applications/${id}`);
}

export async function captureJob(data: any) {
  return apiCall<any>('/capture-job', { method: 'POST', body: data });
}

export async function getQueueNext(candidateId: string) {
  return apiCall<any>('/queue/next', { params: { candidateId } });
}

export async function getReadiness(applicationId: string) {
  return apiCall<any>(`/readiness/${applicationId}`);
}

export async function previewReadiness(jdText: string) {
  return apiCall<any>('/readiness/preview', { method: 'POST', body: { jdText } });
}

export async function postEvidence(data: any) {
  return apiCall<any>('/evidence', { method: 'POST', body: data });
}

export async function getAdaptersManifest() {
  return apiCall<any>('/adapters/manifest');
}

export async function getDebugState() {
  return apiCall<any>('/_debug/state');
}
