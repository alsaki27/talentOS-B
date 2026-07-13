import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeReadinessScore } from '../src/index.js';

const VOCABULARY = [
  'react', 'typescript', 'node.js', 'sql', 'git', 'kubernetes',
  'python', 'docker', 'aws', 'graphql', 'java', 'c#', 'go', 'rust',
  'terraform', 'jenkins', 'css', 'html', 'javascript', 'mongodb',
  'postgresql', 'redis', 'kafka', 'ci/cd',
];

describe('computeReadinessScore', () => {
  it('returns 50 when no required skills match vocabulary', () => {
    const result = computeReadinessScore({
      jdText: 'This job requires excellent communication skills.',
      evidencedSkills: [],
      claimedSkills: [],
      knownSkillVocabulary: VOCABULARY,
    });
    assert.equal(result.score, 50);
    assert.deepEqual(result.required, []);
    assert.deepEqual(result.matched, []);
    assert.deepEqual(result.missing, []);
    assert.deepEqual(result.flagged, []);
  });

  it('computes perfect score when all required skills are evidenced', () => {
    const result = computeReadinessScore({
      jdText: 'Must know React, TypeScript, and Node.js. SQL experience required.',
      evidencedSkills: ['react', 'typescript', 'node.js', 'sql'],
      claimedSkills: ['react', 'typescript', 'node.js', 'sql'],
      knownSkillVocabulary: VOCABULARY,
    });
    assert.equal(result.score, 100);
    assert.deepEqual(result.required.sort(), ['node.js', 'react', 'sql', 'typescript'].sort());
    assert.deepEqual(result.matched.sort(), ['node.js', 'react', 'sql', 'typescript'].sort());
    assert.deepEqual(result.missing, []);
    assert.deepEqual(result.flagged, []);
  });

  it('computes partial score', () => {
    const result = computeReadinessScore({
      jdText: 'React TypeScript Node.js SQL Git required.',
      evidencedSkills: ['react', 'typescript'],
      claimedSkills: ['react', 'typescript', 'node.js'],
      knownSkillVocabulary: VOCABULARY,
    });
    assert.equal(result.score, 40); // 2/5 = 40%
    assert.equal(result.required.length, 5);
    assert.equal(result.matched.length, 2);
    assert.equal(result.missing.length, 3);
    assert.equal(result.flagged.length, 1); // node.js claimed but not evidenced
  });

  it('incident fixture scores below threshold', () => {
    // Handover: cand_demo has react/typescript/node.js/sql/git evidenced
    // plus an unevidenced 'kubernetes' claim that should be flagged
    const result = computeReadinessScore({
      jdText: 'We need React, TypeScript, Node.js, SQL, Git, Kubernetes, Docker, AWS, Terraform, and CI/CD experience.',
      evidencedSkills: ['react', 'typescript', 'node.js', 'sql', 'git'],
      claimedSkills: ['react', 'typescript', 'node.js', 'sql', 'git', 'kubernetes'],
      knownSkillVocabulary: VOCABULARY,
    });
    assert.ok(result.score < 70, `Expected score < 70, got ${result.score}`);
    assert.ok(result.flagged.includes('kubernetes'), 'kubernetes should be flagged as claimed but not evidenced');
    assert.equal(result.required.length, 10);
    assert.equal(result.matched.length, 5);
    assert.equal(result.missing.length, 5);
  });

  it('normalizes skill names (case, special chars)', () => {
    const result = computeReadinessScore({
      jdText: 'Node.JS and TypeScript needed!',
      evidencedSkills: ['Node.js', 'TypeScript'],
      claimedSkills: [],
      knownSkillVocabulary: ['node.js', 'typescript'],
    });
    assert.equal(result.score, 100);
    assert.equal(result.matched.length, 2);
  });

  it('flagged skills are claimed minus evidenced regardless of JD', () => {
    const result = computeReadinessScore({
      jdText: 'React developer needed.',
      evidencedSkills: ['react'],
      claimedSkills: ['react', 'kubernetes', 'aws'],
      knownSkillVocabulary: VOCABULARY,
    });
    assert.deepEqual(result.flagged.sort(), ['aws', 'kubernetes']);
  });

  it('exports default threshold of 70', () => {
    const { DEFAULT_THRESHOLD } = require('../src/index.js');
    assert.equal(DEFAULT_THRESHOLD, 70);
  });
});
