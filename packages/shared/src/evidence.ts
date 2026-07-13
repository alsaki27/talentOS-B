/**
 * B6: Evidence capture — reusable across B1 and B5 extensions.
 *
 * Installs a capture-phase submit listener that does NOT prevent the event.
 * Aligned with TalentOS evidence model:
 *   { source_type, title, description, related_skills, proof_url, confidence_score }
 */

export function installEvidenceListener(applicationId: string): void {
  const doc = (globalThis as any).document;
  const win = (globalThis as any).window;
  if (typeof doc === 'undefined') return;

  const handler = (_event: unknown): void => {
    try {
      const d = doc as any;
      const form = d.querySelector('form');
      const formFields: Record<string, string> = {};
      if (form) {
        const inputs = form.querySelectorAll('input, textarea, select');
        for (const el of inputs as any) {
          if (el.name && el.value && el.type !== 'password' && el.type !== 'hidden') {
            formFields[el.name] = String(el.value).slice(0, 200);
          }
        }
      }

      const confirmEl = d.querySelector('.confirmation, .thank-you, .success, [data-confirmation]');
      const confirmText = confirmEl ? String(confirmEl.innerText).slice(0, 500) : '';

      chrome.runtime.sendMessage({
        action: 'captureEvidence',
        data: {
          applicationId,
          url: win?.location?.href || '',
          title: d.title || '',
          formFields: Object.keys(formFields).length > 0 ? formFields : undefined,
          confirmText: confirmText || undefined,
        },
      }).catch(() => {});
    } catch {
      // Best-effort
    }
  };

  (doc as any).addEventListener('submit', handler, true);
}
