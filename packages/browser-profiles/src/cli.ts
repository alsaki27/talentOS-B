#!/usr/bin/env node
// B2: CLI for creating isolated Chrome profiles per candidate
import * as fs from 'fs';
import * as path from 'path';

const PROFILE_BASE = path.join(process.env.HOME || process.env.USERPROFILE || '', 'TalentOSProfiles');

async function createProfile(candidateId: string, email: string, linkedinUrl?: string) {
  const profileDir = path.join(PROFILE_BASE, candidateId);
  if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, {recursive: true});
  
  const marker = {candidate_id: candidateId, created_at: new Date().toISOString(), email, linkedin: linkedinUrl || null};
  fs.writeFileSync(path.join(profileDir, '.talentos-profile'), JSON.stringify(marker, null, 2));
  
  console.log(`✓ Created profile: ${profileDir}`);
  console.log(`Add this to Chrome: chrome://version/ → Profile Path, use ${profileDir}`);
  console.log(`Then set localStorage: localStorage.setItem('talentos_candidate_id', '${candidateId}')`);
}

const args = process.argv.slice(2);
if (args[0] === 'create' && args[1]) {
  createProfile(args[1], args[2] || '', args[3]);
} else {
  console.log('Usage: talentos-profile create <candidateId> <email> [linkedinUrl]');
}
