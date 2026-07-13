import { getCandidateId } from './auth';

export class ProfileGateError extends Error {
  type: 'NO_MARKER' | 'MALFORMED_MARKER' | 'CANDIDATE_MISMATCH';

  constructor(type: 'NO_MARKER' | 'MALFORMED_MARKER' | 'CANDIDATE_MISMATCH', message?: string) {
    super(message || `Profile gate failure: ${type}`);
    this.name = 'ProfileGateError';
    this.type = type;
  }
}

/**
 * B2 gate: require a valid browser profile marker in chrome.storage.local.
 * Hard-fails with a typed ProfileGateError.
 *
 * @param expectedId Optional candidate ID to validate against the stored marker.
 * @returns The stored candidate ID.
 */
export async function requireProfile(expectedId?: string): Promise<string> {
  const stored = await getCandidateId();

  if (!stored) {
    throw new ProfileGateError('NO_MARKER', 'No browser profile marker found. Run `talentos-profile create` first, then set the candidate ID in the extension options page.');
  }

  const trimmed = stored.trim();
  if (!trimmed || !/^[a-zA-Z0-9_-]{3,64}$/.test(trimmed)) {
    throw new ProfileGateError('MALFORMED_MARKER', 'Browser profile marker is malformed. Re-create the profile.');
  }

  if (expectedId && trimmed !== expectedId) {
    throw new ProfileGateError('CANDIDATE_MISMATCH', `Profile mismatch: expected ${expectedId}, got ${trimmed}`);
  }

  return trimmed;
}
