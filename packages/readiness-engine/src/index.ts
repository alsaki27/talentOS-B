/**
 * TalentOS Readiness Engine — pure, deterministic scoring.
 * Zero dependencies. [MIGRATE] lifts verbatim into
 * TalentOS src/server/services/readinessService.ts
 */

export interface ReadinessInput {
  jdText: string;
  evidencedSkills: string[];
  claimedSkills: string[];
  knownSkillVocabulary: string[];
}

export interface ReadinessOutput {
  required: string[];
  matched: string[];
  missing: string[];
  flagged: string[];
  score: number;
  threshold: number;
}

export const DEFAULT_THRESHOLD = 70;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9.#+]/g, '')
    .replace(/^\.+|\.+$/g, '')  // strip leading/trailing dots only (sentence punctuation)
    .trim();
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,;|()]+/)
    .map(normalize)
    .filter(Boolean);
}

/**
 * Pure, deterministic readiness score.
 *
 *   required = vocabulary ∩ terms(jdText)
 *   matched  = required ∩ evidencedSkills
 *   missing  = required − matched
 *   flagged  = claimedSkills − evidencedSkills
 *   score    = required.length ? round(100 * |matched| / |required|) : 50
 */
export function computeReadinessScore(
  input: ReadinessInput,
  threshold: number = DEFAULT_THRESHOLD
): ReadinessOutput {
  const normalizedVocabulary = input.knownSkillVocabulary.map(normalize);
  const normalizedEvidenced = input.evidencedSkills.map(normalize);
  const normalizedClaimed = input.claimedSkills.map(normalize);
  const jdTerms = new Set(tokenize(input.jdText));

  const required = normalizedVocabulary.filter((w) => jdTerms.has(w));
  const matched = required.filter((w) => normalizedEvidenced.includes(w));
  const missing = required.filter((w) => !normalizedEvidenced.includes(w));
  const flagged = normalizedClaimed.filter((w) => !normalizedEvidenced.includes(w));

  const score = required.length > 0
    ? Math.round((100 * matched.length) / required.length)
    : 50;

  return { required, matched, missing, flagged, score, threshold };
}
