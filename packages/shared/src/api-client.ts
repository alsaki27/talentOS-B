import { ApiError } from './a4-dtos';
import { getApiKey, getApiBase } from './auth';

const CLIENT_VERSION = typeof TALENTOS_CLIENT_VERSION !== 'undefined'
  ? (TALENTOS_CLIENT_VERSION as unknown as string)
  : 'shared/0.2.0';

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
}

async function apiCall<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, timeout = 15000 } = options;

  const base = await getApiBase();
  const key = await getApiKey();
  const url = `${base}${endpoint}`;

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${key}`,
    'X-TalentOS-Client': CLIENT_VERSION,
    ...headers,
  };

  if (method === 'POST' && !reqHeaders['Idempotency-Key']) {
    reqHeaders['Idempotency-Key'] = crypto.randomUUID();
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      method,
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const data = await res.json() as Record<string, unknown>;

    if (!res.ok) {
      const errData = (data as any)?.error;
      const err = errData || { code: 'unknown', message: `HTTP ${res.status}` };
      throw new ApiError(res.status, String(err.code || 'unknown'), String(err.message || ''), err.details as Record<string, unknown> | undefined);
    }

    return data as unknown as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if ((err as any)?.name === 'AbortError') {
      throw new ApiError(0, 'timeout', 'Request timed out');
    }
    throw new ApiError(0, 'network_error', String(err));
  } finally {
    clearTimeout(timer);
  }
}

// ─── Typed endpoint helpers ───

import type { CaptureJobRequest, CaptureJobResponse, QueueNextResponse, ReadinessOutput, ReadinessPreviewRequest, EvidenceRequest, EvidenceResponse, AdaptersManifest } from './a4-dtos';

export async function captureJob(data: CaptureJobRequest): Promise<CaptureJobResponse> {
  return apiCall<CaptureJobResponse>('/capture-job', { method: 'POST', body: data });
}

export async function getNextQueueItem(candidateId: string): Promise<QueueNextResponse> {
  return apiCall<QueueNextResponse>(`/queue/next?candidateId=${encodeURIComponent(candidateId)}`);
}

export async function getReadinessScore(applicationId: string): Promise<ReadinessOutput> {
  return apiCall<ReadinessOutput>(`/readiness/${encodeURIComponent(applicationId)}`);
}

export async function previewReadiness(data: ReadinessPreviewRequest): Promise<ReadinessOutput> {
  return apiCall<ReadinessOutput>('/readiness/preview', { method: 'POST', body: data });
}

export async function postEvidence(data: EvidenceRequest): Promise<EvidenceResponse> {
  return apiCall<EvidenceResponse>('/evidence', { method: 'POST', body: data });
}

export async function getAdaptersManifest(): Promise<AdaptersManifest> {
  return apiCall<AdaptersManifest>('/adapters/manifest');
}
