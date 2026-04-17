'use strict';

const { TeamSync } = require('../../lib/memory/team-sync');
const { GlobalMemory } = require('../../lib/memory/global-memory');
const path = require('path');
const os = require('os');
const fs = require('fs');

const SIGNING_SECRET = 'team-sync-test-secret-at-least-32-chars-long';

function makeMemory() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gm-'));
  const gm = new GlobalMemory({ globalDir: dir });
  gm.init();
  // Seed a pattern
  gm.recordPattern({
    type: 'testing',
    pattern: 'Use jest',
    confidence: 0.8,
    occurrences: 5,
    sources: ['repo-a'],
  });
  return { gm, dir };
}

describe('TeamSync signing (H3)', () => {
  test('constructor rejects short signingSecret', () => {
    expect(() => new TeamSync(null, { signingSecret: 'short' }))
      .toThrow(/at least 32 chars/);
  });

  test('signed export contains signature + algorithm', () => {
    const { gm, dir } = makeMemory();
    const sync = new TeamSync(gm, { signingSecret: SIGNING_SECRET });
    const data = sync.exportForTeam('eng');
    expect(data.signature).toBeDefined();
    expect(data.signatureAlg).toBe('HMAC-SHA256');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('unsigned export has no signature field', () => {
    const { gm, dir } = makeMemory();
    const sync = new TeamSync(gm);
    const data = sync.exportForTeam('eng');
    expect(data.signature).toBeUndefined();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('signed import round-trip succeeds', () => {
    const { gm: gmA, dir: dirA } = makeMemory();
    const { gm: gmB, dir: dirB } = makeMemory();

    const syncA = new TeamSync(gmA, { signingSecret: SIGNING_SECRET });
    const syncB = new TeamSync(gmB, { signingSecret: SIGNING_SECRET });

    const data = syncA.exportForTeam('eng');
    const result = syncB.importFromTeam(data);
    expect(result.success).toBe(true);
    expect(result.summary).toBeDefined();

    fs.rmSync(dirA, { recursive: true, force: true });
    fs.rmSync(dirB, { recursive: true, force: true });
  });

  test('REJECTS import with tampered payload', () => {
    const { gm: gmA, dir: dirA } = makeMemory();
    const { gm: gmB, dir: dirB } = makeMemory();

    const syncA = new TeamSync(gmA, { signingSecret: SIGNING_SECRET });
    const syncB = new TeamSync(gmB, { signingSecret: SIGNING_SECRET });

    const data = syncA.exportForTeam('eng');
    // Tamper: add a new malicious pattern
    data.patterns.push({ type: 'malicious', pattern: 'rm -rf /', confidence: 1, occurrences: 99, sources: [] });

    const result = syncB.importFromTeam(data);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Signature verification failed');

    fs.rmSync(dirA, { recursive: true, force: true });
    fs.rmSync(dirB, { recursive: true, force: true });
  });

  test('REJECTS import with wrong signing secret', () => {
    const { gm: gmA, dir: dirA } = makeMemory();
    const { gm: gmB, dir: dirB } = makeMemory();

    const syncA = new TeamSync(gmA, { signingSecret: SIGNING_SECRET });
    const syncB = new TeamSync(gmB, { signingSecret: 'different-secret-at-least-32-chars-long' });

    const data = syncA.exportForTeam('eng');
    const result = syncB.importFromTeam(data);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Signature verification failed');

    fs.rmSync(dirA, { recursive: true, force: true });
    fs.rmSync(dirB, { recursive: true, force: true });
  });

  test('REJECTS unsigned data when requireSignature=true (no secret)', () => {
    const { gm, dir } = makeMemory();
    const sync = new TeamSync(gm, { requireSignature: true });
    const unsigned = { patterns: [{ type: 'x', pattern: 'p', confidence: 1, occurrences: 1, sources: [] }] };
    const result = sync.importFromTeam(unsigned);
    expect(result.success).toBe(false);
    expect(result.error).toContain('unsigned');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('REJECTS unsigned data when signingSecret is set', () => {
    const { gm, dir } = makeMemory();
    const sync = new TeamSync(gm, { signingSecret: SIGNING_SECRET });
    const unsigned = { patterns: [{ type: 'x', pattern: 'p', confidence: 1, occurrences: 1, sources: [] }] };
    const result = sync.importFromTeam(unsigned);
    expect(result.success).toBe(false);
    expect(result.error).toContain('unsigned');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('accepts unsigned data when no signing configured (backward compat)', () => {
    const { gm, dir } = makeMemory();
    const sync = new TeamSync(gm); // no config
    const unsigned = {
      patterns: [{ type: 'x', pattern: 'p', confidence: 1, occurrences: 1, sources: [] }],
    };
    const result = sync.importFromTeam(unsigned);
    expect(result.success).not.toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
