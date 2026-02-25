'use strict';

const { AuditLog } = require('../../lib/enterprise/audit-log');

describe('AuditLog', () => {
  let log;

  beforeEach(() => {
    log = new AuditLog();
  });

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

  test('log creates hash chain', () => {
    log.log({ userId: 'u1', action: 'a1' });
    log.log({ userId: 'u2', action: 'a2' });
    expect(log.entries[0].hash).toBeDefined();
    expect(log.entries[1].hash).toBeDefined();
    expect(log.entries[0].hash).not.toBe(log.entries[1].hash);
  });

  test('log respects maxEntries', () => {
    const small = new AuditLog({ maxEntries: 3 });
    small.log({ userId: 'u', action: 'a1' });
    small.log({ userId: 'u', action: 'a2' });
    small.log({ userId: 'u', action: 'a3' });
    small.log({ userId: 'u', action: 'a4' });
    expect(small.size()).toBe(3);
    expect(small.entries[0].action).toBe('a2'); // a1 evicted
  });

  test('log without hash chain', () => {
    const noHash = new AuditLog({ hashChain: false });
    const entry = noHash.log({ userId: 'u', action: 'test' });
    expect(entry.hash).toBeUndefined();
  });

  test('query returns all entries by default', () => {
    log.log({ userId: 'u1', action: 'a1' });
    log.log({ userId: 'u2', action: 'a2' });
    expect(log.query().length).toBe(2);
  });

  test('query filters by userId', () => {
    log.log({ userId: 'u1', action: 'a1' });
    log.log({ userId: 'u2', action: 'a2' });
    expect(log.query({ userId: 'u1' }).length).toBe(1);
  });

  test('query filters by action', () => {
    log.log({ userId: 'u', action: 'login' });
    log.log({ userId: 'u', action: 'create_plan' });
    expect(log.query({ action: 'login' }).length).toBe(1);
  });

  test('query filters by outcome', () => {
    log.log({ userId: 'u', action: 'a', outcome: 'success' });
    log.log({ userId: 'u', action: 'a', outcome: 'denied' });
    expect(log.query({ outcome: 'denied' }).length).toBe(1);
  });

  test('query supports limit and offset', () => {
    for (let i = 0; i < 10; i++) log.log({ userId: 'u', action: `a${i}` });
    expect(log.query({ limit: 3 }).length).toBe(3);
    expect(log.query({ limit: 3, offset: 8 }).length).toBe(2);
  });

  test('query filters by time range', () => {
    log.log({ userId: 'u', action: 'old' });
    // Manually set first entry's timestamp to the past
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

  test('verifyIntegrity passes for valid chain', () => {
    log.log({ userId: 'u', action: 'a1' });
    log.log({ userId: 'u', action: 'a2' });
    expect(log.verifyIntegrity().valid).toBe(true);
  });

  test('verifyIntegrity detects tampering', () => {
    log.log({ userId: 'u', action: 'a1' });
    log.log({ userId: 'u', action: 'a2' });
    log.entries[0].hash = 'tampered';
    expect(log.verifyIntegrity().valid).toBe(false);
    expect(log.verifyIntegrity().brokenAt).toBe(0);
  });

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

  test('clear resets everything', () => {
    log.log({ userId: 'u', action: 'test' });
    log.clear();
    expect(log.size()).toBe(0);
    expect(log.verifyIntegrity().valid).toBe(true);
  });
});
