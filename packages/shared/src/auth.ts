const KEY_STORAGE_KEY = 'talentos_extension_key';
const CANDIDATE_ID_KEY = 'talentos_candidate_id';
const API_BASE_KEY = 'talentos_api_base';

export async function getApiKey(): Promise<string> {
  const result = await chrome.storage.local.get(KEY_STORAGE_KEY);
  return result[KEY_STORAGE_KEY] || '';
}

export async function setApiKey(key: string): Promise<void> {
  await chrome.storage.local.set({ [KEY_STORAGE_KEY]: key });
}

export async function getApiBase(): Promise<string> {
  const result = await chrome.storage.local.get(API_BASE_KEY);
  return result[API_BASE_KEY] || 'http://localhost:4114';
}

export async function setApiBase(base: string): Promise<void> {
  await chrome.storage.local.set({ [API_BASE_KEY]: base });
}

export async function getCandidateId(): Promise<string> {
  const result = await chrome.storage.local.get(CANDIDATE_ID_KEY);
  return result[CANDIDATE_ID_KEY] || '';
}

export async function setCandidateId(id: string): Promise<void> {
  await chrome.storage.local.set({ [CANDIDATE_ID_KEY]: id });
}

export async function requireApiKey(): Promise<string> {
  const key = await getApiKey();
  if (!key) {
    throw new Error(
      'TalentOS API key not set. Open the extension options page to paste your key (starts with tos_).'
    );
  }
  return key;
}

export async function clearAuth(): Promise<void> {
  await chrome.storage.local.remove([KEY_STORAGE_KEY, CANDIDATE_ID_KEY, API_BASE_KEY]);
}
