export async function validateBrowserProfile(expectedId?: string): Promise<string | null> {
  const marker = localStorage.getItem('talentos_candidate_id');
  if (!marker) return null;
  if (expectedId && marker !== expectedId) throw new Error(`Profile mismatch: ${expectedId} vs ${marker}`);
  return marker;
}
