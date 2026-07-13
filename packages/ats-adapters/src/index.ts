export type AdapterMaturity = 'draft' | 'verified';

export interface ATSAdapter {
  name: string;
  version: string;
  lastVerified: string;   // ISO date, committed constant
  maturity: AdapterMaturity;
  selectorChecksum: string;
  selectors: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    workAuth?: string;
    linkedin?: string;
    portfolio?: string;
    resumeUpload?: string;
  };
}

export interface FillResult {
  field: string;
  status: 'filled' | 'uncertain' | 'unknown';
  value: string | null;
  selector: string | null;
}

export const adapters: Record<string, ATSAdapter> = {
  greenhouse: {
    name: 'Greenhouse',
    version: '1.0.0',
    lastVerified: '2026-07-11',
    maturity: 'verified',
    selectorChecksum: 'c116263bfc34',
    selectors: {
      name: 'input[name="job_application[first_name]"], #first_name',
      email: 'input[name="job_application[email]"], #email',
      phone: 'input[name="job_application[phone]"], #phone',
      location: 'input[name="job_application[location]"], #location',
      resumeUpload: 'input[type="file"][accept*="pdf"]',
    },
  },
  lever: {
    name: 'Lever',
    version: '1.0.0',
    lastVerified: '2026-07-11',
    maturity: 'draft',
    selectorChecksum: 'dace14d557c1',
    selectors: {
      name: 'input[name="name"], input[placeholder*="name" i]',
      email: 'input[name="email"], input[type="email"]',
      phone: 'input[name="phone"], input[type="tel"]',
      location: 'input[name="location"], input[name="location"]',
      linkedin: 'input[name="urls[LinkedIn]"], input[placeholder*="linkedin" i]',
      resumeUpload: 'input[type="file"]',
    },
  },
  ashby: {
    name: 'Ashby',
    version: '1.0.0',
    lastVerified: '2026-07-11',
    maturity: 'draft',
    selectorChecksum: '806ed56989df',
    selectors: {
      name: 'input[id*="name"], input[name*="name"]',
      email: 'input[id*="email"], input[name*="email"]',
      phone: 'input[id*="phone"], input[name*="phone"]',
      location: 'input[id*="location"], input[name*="location"]',
      linkedin: 'input[id*="linkedin"], input[name*="linkedin"]',
      resumeUpload: 'input[type="file"]',
    },
  },
  workday: {
    name: 'Workday',
    version: '1.0.0',
    lastVerified: '2026-07-11',
    maturity: 'draft',
    selectorChecksum: 'stub',
    selectors: {},
  },
  icims: {
    name: 'iCIMS',
    version: '1.0.0',
    lastVerified: '2026-07-11',
    maturity: 'draft',
    selectorChecksum: 'stub',
    selectors: {},
  },
};

export function getAdapter(atsName: string): ATSAdapter | null {
  return adapters[atsName.toLowerCase()] || null;
}

export interface ProfileValues {
  name: string;
  email: string;
  phone: string;
  location: string;
  workAuthorization: string;
  linkedin: string | null;
  portfolio: string | null;
}

const PROFILE_TO_FIELD: Record<string, keyof ProfileValues> = {
  name: 'name',
  email: 'email',
  phone: 'phone',
  location: 'location',
  workAuth: 'workAuthorization',
  linkedin: 'linkedin',
  portfolio: 'portfolio',
};

/**
 * Fill engine: given an adapter and candidate profile values,
 * yields per-field statuses. Never throws on unknown fields.
 */
export function fillFields(
  adapter: ATSAdapter,
  profile: ProfileValues
): FillResult[] {
  const results: FillResult[] = [];

  for (const [fieldKey, profileKey] of Object.entries(PROFILE_TO_FIELD)) {
    const selector = adapter.selectors[fieldKey as keyof typeof adapter.selectors];
    const value = profile[profileKey];

    if (!selector) {
      results.push({ field: fieldKey, status: 'unknown', value: value || null, selector: null });
      continue;
    }

    try {
      const el = document.querySelector(selector);
      if (!el) {
        results.push({ field: fieldKey, status: 'unknown', value: value || null, selector });
      } else if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        // Multiple matching selectors → uncertain
        const allEls = document.querySelectorAll(selector);
        results.push({
          field: fieldKey,
          status: allEls.length > 1 ? 'uncertain' : 'filled',
          value: value || null,
          selector,
        });
      } else {
        results.push({ field: fieldKey, status: 'uncertain', value: value || null, selector });
      }
    } catch {
      results.push({ field: fieldKey, status: 'unknown', value: value || null, selector });
    }
  }

  return results;
}
