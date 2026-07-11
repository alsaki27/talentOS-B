// B5: Apply Copilot - autofill, flag uncertain fields, stop before submit
// Hard gate: B2 profile check must pass first
// Hard constraint: submit button NEVER clicked programmatically
import {validateBrowserProfile, getApiKey, getNextQueueItem, getAdaptersManifest} from '@talentos/shared';

async function main() {
  try {
    const candidateId = await validateBrowserProfile();
    if (!candidateId) throw new Error('No valid browser profile - B2 gate failed');
    
    const token = getApiKey();
    const nextTicket = await getNextQueueItem(token);
    const manifest = await getAdaptersManifest(token);
    
    console.log('✓ Profile validated, ticket loaded, adapters fresh');
    console.log('Next: detect ATS, load adapter, fill fields, show review panel');
    // TODO: load adapter, fill form, flag uncertainties, pause at submit
  } catch (e) {
    console.error('Copilot failed:', e);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
