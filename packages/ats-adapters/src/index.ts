// B4: ATS adapter registry and field mappers
export interface ATSAdapter {
  name: string;
  version: string;
  lastVerified: string;
  selectors: {
    name?: string; email?: string; phone?: string; location?: string;
    workAuth?: string; linkedin?: string; portfolio?: string; resumeUpload?: string;
  };
}

export const adapters: Record<string, ATSAdapter> = {
  greenhouse: {
    name: 'Greenhouse',
    version: '1.0.0',
    lastVerified: new Date().toISOString(),
    selectors: {
      name: 'input[name="candidate[first_name]"]',
      email: 'input[name="candidate[email]"]',
      phone: 'input[name="candidate[phone]"]',
      location: 'input[name="candidate[location]"]',
      resumeUpload: 'input[type="file"][accept*="pdf"]'
    }
  },
  lever: {
    name: 'Lever',
    version: '1.0.0',
    lastVerified: new Date().toISOString(),
    selectors: {
      name: 'input[placeholder*="name"]',
      email: 'input[type="email"]',
      phone: 'input[type="tel"]',
      resumeUpload: 'input[type="file"]'
    }
  }
};

export function getAdapter(atsName: string): ATSAdapter | null {
  return adapters[atsName.toLowerCase()] || null;
}

export function validateSelector(selector: string): boolean {
  try {
    document.querySelector(selector);
    return true;
  } catch { return false; }
}
