// ─── Request/Response DTOs for A4 Extension API v1 ───
// [MIGRATE] Mirror these shapes in TalentOS src/app/api/extension/v1/*/route.ts

export interface CaptureJobRequest {
  title: string;
  applyUrl: string;
  jdText: string;
  company?: string;
  location?: string;
  sourceSite?: string;
  salary?: string;
  atsDetected?: string;
  screenshotUrl?: string | null;
}

export interface CaptureJobResponse {
  jobId: string;
  duplicate: boolean;
}

export interface QueueTicket {
  applicationId: string;
  jobTitle: string;
  company: string;
  applyUrl: string;
  profile: CandidateProfile;
}

export interface CandidateProfile {
  name: string;
  email: string;
  phone: string;
  location: string;
  workAuthorization: string;
  linkedin: string | null;
  portfolio: string | null;
  resumeUrl: string | null;
}

export interface QueueNextResponse {
  ticket: QueueTicket;
}

export interface ReadinessOutput {
  required: string[];
  matched: string[];
  missing: string[];
  flagged: string[];
  score: number;
  threshold: number;
}

export interface ReadinessPreviewRequest {
  jdText: string;
}

export interface EvidenceRequest {
  applicationId: string;
  screenshotUrl?: string;
  confirmationScrape?: Record<string, unknown>;
}

export interface EvidenceResponse {
  evidenceId: string;
  duplicate: boolean;
}

export interface AdapterManifestEntry {
  name: string;
  version: string;
  maturity: 'draft' | 'verified';
  checksum: string;
}

export interface AdaptersManifest {
  manifestVersion: string;
  updatedAt: string;
  adapters: AdapterManifestEntry[];
}

// ─── Error envelope ───

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
