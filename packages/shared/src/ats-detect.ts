const ATS_DOMAIN_SUFFIXES: [string, string][] = [
  ['greenhouse.io', 'greenhouse'],
  ['lever.co', 'lever'],
  ['jobs.ashbyhq.com', 'ashby'],
  ['myworkdayjobs.com', 'workday'],
  ['workday.com', 'workday'],
  ['icims.com', 'icims'],
  ['taleo.net', 'taleo'],
  ['bamboohr.com', 'bamboohr'],
];

export function detectATS(hostname: string): string | null {
  const lower = hostname.toLowerCase();
  for (const [suffix, name] of ATS_DOMAIN_SUFFIXES) {
    if (lower.endsWith(`.${suffix}`) || lower === suffix) {
      return name;
    }
  }
  return null;
}

export const KNOWN_ATS: Record<string, string> = {
  greenhouse: 'greenhouse',
  'greenhouse.io': 'greenhouse',
  lever: 'lever',
  'lever.co': 'lever',
  ashby: 'ashby',
  'jobs.ashbyhq.com': 'ashby',
  workday: 'workday',
  'workday.com': 'workday',
  'myworkdayjobs.com': 'workday',
  icims: 'icims',
  'icims.com': 'icims',
  taleo: 'taleo',
  'taleo.net': 'taleo',
  bamboohr: 'bamboohr',
  'bamboohr.com': 'bamboohr',
};
