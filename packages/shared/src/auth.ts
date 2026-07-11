export function getApiKey(): string { return localStorage.getItem('talentos_extension_key') || ''; }
export function setApiKey(key: string): void { localStorage.setItem('talentos_extension_key', key); }
export function clearAuth(): void { localStorage.removeItem('talentos_extension_key'); localStorage.removeItem('talentos_candidate_id'); }
