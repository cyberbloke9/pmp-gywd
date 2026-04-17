'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { AuditLog } = require('../../lib/enterprise/audit-log');

const SECRET = 'test-secret-at-least-32-bytes-long-for-hmac-safety';

describe('AuditLog', () => {
  let log;

  beforeEach(() => {
    log = new AuditLog({ secret: SECRET });
  });

  describe('construction', () => {
    test('requires a >=32-char secret when hashChain enabled', () => {
      expect(() => new AuditLog()).toThrow(/HMAC secret required/);
      expect(() => new AuditLog({ secret: 'short' })).toThrow(/HMAC secret required/);
    });

    test('no secret needed when hashChain disabled', () => {
      expect(() => new AuditLog({ hashChain: false })).not.toThrow();
    });
  });

  describe('basic logging', () => {
    test('starts empty', () => {
      expect(log.size()).toBe(0);
    });

    test('log adds an entry', () => {
      const entry = log.log({ userId: 'user1', action: 'login' });
      expect(entry.id).toBeDefined();
      expect(entry.userId).toBe('user1');
      expect(entry.action).toBe('login');
      expect(entry.outcome).toBe('success');
      expect(entry.timestamp).toBeGreaterThan(0);
      expect(log.size()).toBe(1);
    });

    test('rejects missing userId', () => {
      expect(() => log.log({ action: 'a' })).toThrow(/userId and action/);
    });

    test('rejects missing action', () => {
      expect(() => log.log({ userId: 'u' })).toThrow(/userId and action/);
    });

    test('rejects invalid outcome', () => {
      expect(() => log.log({ userId: 'u', action: 'a', outcome: 'banana' })).toThrow(/invalid outcome/);
    });

    test('log stores all fields', () => {
      const entry = log.log({
        userId: 'u1', action: 'create_plan', resource: 'plan', resourceId: 'p1',
        outcome: 'failure', metadata: { reason: 'validation' }, ip: '1.2.3.4', sessionId: 's1',
      });
      expect(entry.resource).toBe('plan');
      expect(entry.resourceId).toBe('p1');
      expect(entry.outcome).toBe('failure');
      expect(entry.metadata.reason).toBe('validation');
      expect(entry.ip).toBe('1.2.3.4');
      expect(entry.sessionId).toBe('s1');
    });
  });

  describe('HMAC chain integrity', () => {
    test('creates hash chain', () => {
      log.log({ userId: 'u1', action: 'a1' });
      log.log({ userId: 'u2', action: 'a2' });
      expect(log.entries[0].hash).toBeDefined();
      expect(log.entries[1].hash).toBeDefined();
      expect(log.entries[0].hash).not.toBe(log.entries[1].hash);
    });

    test('verifyIntegrity passes for valid chain', () => {
      log.log({ userId: 'u', action: 'a1' });
      log.log({ userId: 'u', action: 'a2' });
      const result = log.verifyIntegrity();
      expect(result.valid).toBe(true);
      expect(result.reason).toBeNull();
    });

    test('verifyIntegrity detects hash tampering', () => {
      log.log({ userId: 'u', action: 'a1' });
      log.log({ userId: 'u', action: 'a2' });
      log.entries[0].hash = 'tampered';
      const result = log.verifyIntegrity();
      expect(result.valid).toBe(false);
      expect(result.brokenAt).toBe(0);
    });

    test('verifyIntegrity detects field tampering (resource)', () => {
      log.log({ userId: 'u', action: 'a', resource: 'plan', resourceId: 'p1' });
      // Mutate a field NOT covered by the old implementation
      log.entries[0].resource = 'hacked';
      expect(log.verifyIntegrity().valid).toBe(false);
    });

    test('verifyIntegrity detects field tampering (outcome)', () => {
      log.log({ userId: 'u', action: 'a', outcome: 'denied' });
      log.entries[0].outcome = 'success';
      expect(log.verifyIntegrity().valid).toBe(false);
    });

    test('verifyIntegrity detects field tampering (metadata)', () => {
      log.log({ userId: 'u', action: 'a', metadata: { key: 'v1' } });
      log.entries[0].metadata = { key: 'v2' };
      expect(log.verifyIntegrity().valid).toBe(false);
    });

    test('verifyIntegrity detects field tampering (ip)', () => {
      log.log({ userId: 'u', action: 'a', ip: '10.0.0.1' });
      log.entries[0].ip = '127.0.0.1';
      expect(log.verifyIntegrity().valid).toBe(false);
    });

    test('different secrets produce different chains', () => {
      const log2 = new AuditLog({ secret: SECRET + 'different' });
      log.log({ userId: 'u', action: 'a' });
      log2.log({ userId: 'u', action: 'a' });
      // Same input, different secrets → different hashes
      expect(log.entries[0].hash).not.toBe(log2.entries[0].hash);
    });

    test('log without hash chain', () => {
      const noHash = new AuditLog({ hashChain: false });
      const entry = noHash.log({ userId: 'u', action: 'test' });
      expect(entry.hash).toBeUndefined();
    });
  });

  describe('query', () => {
    test('returns all entries by default', () => {
      log.log({ userId: 'u1', action: 'a1' });
      log.log({ userId: 'u2', action: 'a2' });
      expect(log.query().length).toBe(2);
    });

    test('filters by userId', () => {
      log.log({ userId: 'u1', action: 'a1' });
      log.log({ userId: 'u2', action: 'a2' });
      expect(log.query({ userId: 'u1' }).length).toBe(1);
    });

    test('filters by action', () => {
      log.log({ userId: 'u', action: 'login' });
      log.log({ userId: 'u', action: 'create_plan' });
      expect(log.query({ action: 'login' }).length).toBe(1);
    });

    test('filters by outcome', () => {
      log.log({ userId: 'u', action: 'a', outcome: 'success' });
      log.log({ userId: 'u', action: 'a', outcome: 'denied' });
      expect(log.query({ outcome: 'denied' }).length).toBe(1);
    });

    test('supports limit and offset', () => {
      for (let i = 0; i < 10; i++) log.log({ userId: 'u', action: `a${i}` });
      expect(log.query({ limit: 3 }).length).toBe(3);
      expect(log.query({ limit: 3, offset: 8 }).length).toBe(2);
    });

    test('filters by time range', () => {
      log.log({ userId: 'u', action: 'old' });
      log.entries[0].timestamp = Date.now() - 10000;
      const mid = Date.now() - 5000;
      log.log({ userId: 'u', action: 'new' });
      expect(log.query({ since: mid }).length).toBe(1);
      expect(log.query({ until: mid }).length).toBe(1);
    });

    test('getResourceHistory', () => {
      log.log({ userId: 'u', action: 'create', resource: 'plan', resourceId: 'p1' });
      log.log({ userId: 'u', action: 'update', resource: 'plan', resourceId: 'p1' });
      log.log({ userId: 'u', action: 'create', resource: 'plan', resourceId: 'p2' });
      expect(log.getResourceHistory('plan', 'p1').length).toBe(2);
    });

    test('getUserActivity returns recent activity', () => {
      log.log({ userId: 'u1', action: 'a1' });
      log.log({ userId: 'u1', action: 'a2' });
      log.log({ userId: 'u2', action: 'a3' });
      expect(log.getUserActivity('u1').length).toBe(2);
    });
  });

  describe('stats and export', () => {
    test('getStats returns action and outcome counts', () => {
      log.log({ userId: 'u1', action: 'login', outcome: 'success' });
      log.log({ userId: 'u1', action: 'login', outcome: 'failure' });
      log.log({ userId: 'u2', action: 'create_plan', outcome: 'success' });
      const stats = log.getStats();
      expect(stats.totalEntries).toBe(3);
      expect(stats.actionCounts.login).toBe(2);
      expect(stats.outcomeCounts.success).toBe(2);
      expect(stats.outcomeCounts.failure).toBe(1);
      expect(stats.uniqueUsers).toBe(2);
      expect(stats.topUsers.length).toBe(2);
    });

    test('export includes entries, integrity, and stats', () => {
      log.log({ userId: 'u', action: 'test' });
      const exported = log.export();
      expect(exported.entries.length).toBe(1);
      expect(exported.integrity.valid).toBe(true);
      expect(exported.stats.totalEntries).toBe(1);
      expect(exported.exportedAt).toBeDefined();
    });

    test('export with filters', () => {
      log.log({ userId: 'u1', action: 'a' });
      log.log({ userId: 'u2', action: 'b' });
      const exported = log.export({ userId: 'u1' });
      expect(exported.entries.length).toBe(1);
    });
  });

  describe('destructive clear protection', () => {
    test('rejects clear when destructiveClearAllowed=false (default)', () => {
      log.log({ userId: 'u', action: 'a' });
      expect(() => log.clear({ reason: 'testing clear flow', callerId: 'admin' })).toThrow(/disabled/);
    });

    test('clear requires reason >=10 chars', () => {
      const c = new AuditLog({ secret: SECRET, destructiveClearAllowed: true });
      expect(() => c.clear({ callerId: 'admin' })).toThrow(/reason/);
      expect(() => c.clear({ callerId: 'admin', reason: 'short' })).toThrow(/reason/);
    });

    test('clear requires callerId', () => {
      const c = new AuditLog({ secret: SECRET, destructiveClearAllowed: true });
      expect(() => c.clear({ reason: 'valid reason here' })).toThrow(/callerId/);
    });

    test('clear records itself in the log', () => {
      const c = new AuditLog({ secret: SECRET, destructiveClearAllowed: true });
      c.log({ userId: 'u', action: 'a' });
      c.clear({ reason: 'legitimate compliance reason', callerId: 'admin1' });
      expect(c.size()).toBe(1); // The clear-event itself
      expect(c.entries[0].action).toBe('audit_log_cleared');
      expect(c.entries[0].userId).toBe('admin1');
      expect(c.entries[0].metadata.reason).toBe('legitimate compliance reason');
    });
  });

  describe('rotation (instead of FIFO shift)', () => {
    test('rotation preserves entries to archive file when configured', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-rotate-'));
      const filePath = path.join(tmpDir, 'audit.jsonl');
      const r = new AuditLog({ secret: SECRET, maxEntries: 3, filePath });

      r.log({ userId: 'u', action: 'a1' });
      r.log({ userId: 'u', action: 'a2' });
      r.log({ userId: 'u', action: 'a3' });
      r.log({ userId: 'u', action: 'a4' }); // triggers rotation

      // Archive file should contain old entries
      const archives = fs.readdirSync(tmpDir).filter(f => f.startsWith('audit-') && f.endsWith('.jsonl'));
      expect(archives.length).toBeGreaterThan(0);

      // Current log has the rotation marker + new entries
      expect(r.size()).toBeGreaterThan(0);
      expect(r.entries.some(e => e.action === 'audit_rotation')).toBe(true);

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('chain integrity survives rotation via carry-hash', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-carry-'));
      const filePath = path.join(tmpDir, 'audit.jsonl');
      const r = new AuditLog({ secret: SECRET, maxEntries: 2, filePath });

      r.log({ userId: 'u', action: 'a1' });
      r.log({ userId: 'u', action: 'a2' });
      r.log({ userId: 'u', action: 'a3' }); // rotates

      // Post-rotation chain should still be valid
      expect(r.verifyIntegrity().valid).toBe(true);

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });

  describe('file persistence', () => {
    test('appends entries to JSONL file', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-fs-'));
      const filePath = path.join(tmpDir, 'audit.jsonl');
      const r = new AuditLog({ secret: SECRET, filePath });

      r.log({ userId: 'u', action: 'a1' });
      r.log({ userId: 'u', action: 'a2' });

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(2);
      expect(JSON.parse(lines[0]).action).toBe('a1');
      expect(JSON.parse(lines[1]).action).toBe('a2');

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('restores entries from existing JSONL file', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-restore-'));
      const filePath = path.join(tmpDir, 'audit.jsonl');

      const r1 = new AuditLog({ secret: SECRET, filePath });
      r1.log({ userId: 'u', action: 'original' });

      // Reopen
      const r2 = new AuditLog({ secret: SECRET, filePath });
      expect(r2.size()).toBe(1);
      expect(r2.entries[0].action).toBe('original');
      expect(r2.verifyIntegrity().valid).toBe(true);

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    test('rejects restore if chain is broken', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-broken-'));
      const filePath = path.join(tmpDir, 'audit.jsonl');

      const r1 = new AuditLog({ secret: SECRET, filePath });
      r1.log({ userId: 'u', action: 'a1' });

      // Tamper the file
      const content = fs.readFileSync(filePath, 'utf8');
      const tampered = content.replace('a1', 'hacked');
      fs.writeFileSync(filePath, tampered);

      expect(() => new AuditLog({ secret: SECRET, filePath })).toThrow(/chain broken|restore failed/);

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });
});
