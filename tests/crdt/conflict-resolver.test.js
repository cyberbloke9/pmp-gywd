'use strict';

const { ConflictResolver } = require('../../lib/crdt/conflict-resolver');

describe('ConflictResolver', () => {
  let resolver;

  beforeEach(() => {
    resolver = new ConflictResolver();
  });

  describe('detectConflicts', () => {
    test('no conflict when identical', () => {
      const base = { title: 'Test', status: 'draft' };
      const local = { title: 'Test', status: 'draft' };
      const remote = { title: 'Test', status: 'draft' };

      const result = resolver.detectConflicts(base, local, remote);
      expect(result.hasConflicts).toBe(false);
      expect(result.conflicts).toEqual([]);
    });

    test('no conflict when only one side changes', () => {
      const base = { title: 'Old' };
      const local = { title: 'New' };
      const remote = { title: 'Old' };

      const result = resolver.detectConflicts(base, local, remote);
      expect(result.hasConflicts).toBe(false);
    });

    test('detects conflict when both sides change same field differently', () => {
      const base = { title: 'Original' };
      const local = { title: 'Local change' };
      const remote = { title: 'Remote change' };

      const result = resolver.detectConflicts(base, local, remote);
      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts.length).toBe(1);
      expect(result.conflicts[0].field).toBe('title');
      expect(result.conflicts[0].localValue).toBe('Local change');
      expect(result.conflicts[0].remoteValue).toBe('Remote change');
    });

    test('detects multiple conflicts', () => {
      const base = { title: 'T', status: 'S', desc: 'D' };
      const local = { title: 'T-local', status: 'S-local', desc: 'D' };
      const remote = { title: 'T-remote', status: 'S-remote', desc: 'D' };

      const result = resolver.detectConflicts(base, local, remote);
      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts.length).toBe(2);
    });

    test('skips internal fields (starting with _)', () => {
      const base = { title: 'T', _internal: 1 };
      const local = { title: 'T', _internal: 2 };
      const remote = { title: 'T', _internal: 3 };

      const result = resolver.detectConflicts(base, local, remote);
      expect(result.hasConflicts).toBe(false);
    });

    test('handles null/undefined base', () => {
      const result = resolver.detectConflicts(null, { a: 1 }, { a: 2 });
      expect(result.hasConflicts).toBe(true);
    });
  });

  describe('resolve', () => {
    test('applies non-conflicting changes', () => {
      const base = { title: 'T', status: 'S' };
      const local = { title: 'New Title', status: 'S' };
      const remote = { title: 'T', status: 'New Status' };

      const { merged } = resolver.resolve(base, local, remote);
      expect(merged.title).toBe('New Title');
      expect(merged.status).toBe('New Status');
    });

    test('resolves conflicts with LWW (default)', () => {
      const base = { title: 'Original' };
      const local = { title: 'Local', _timestamp: 100 };
      const remote = { title: 'Remote', _timestamp: 200 };

      const { merged, resolutions } = resolver.resolve(base, local, remote);
      expect(merged.title).toBe('Remote'); // Remote has higher timestamp
      expect(resolutions[0].strategy).toBe('lww-remote');
    });

    test('LWW prefers local when local is newer', () => {
      const base = { title: 'Original' };
      const local = { title: 'Local', _timestamp: 300 };
      const remote = { title: 'Remote', _timestamp: 100 };

      const { merged } = resolver.resolve(base, local, remote);
      expect(merged.title).toBe('Local');
    });

    test('resolves with local-wins strategy', () => {
      const r = new ConflictResolver({ defaultStrategy: 'local-wins' });
      const { merged } = r.resolve(
        { x: 1 },
        { x: 10 },
        { x: 20 },
      );
      expect(merged.x).toBe(10);
    });

    test('resolves with remote-wins strategy', () => {
      const r = new ConflictResolver({ defaultStrategy: 'remote-wins' });
      const { merged } = r.resolve(
        { x: 1 },
        { x: 10 },
        { x: 20 },
      );
      expect(merged.x).toBe(20);
    });

    test('resolves with max strategy', () => {
      const r = new ConflictResolver({ fieldStrategies: { count: 'max' } });
      const { merged } = r.resolve(
        { count: 5 },
        { count: 10 },
        { count: 8 },
      );
      expect(merged.count).toBe(10);
    });

    test('resolves with min strategy', () => {
      const r = new ConflictResolver({ fieldStrategies: { priority: 'min' } });
      const { merged } = r.resolve(
        { priority: 5 },
        { priority: 3 },
        { priority: 7 },
      );
      expect(merged.priority).toBe(3);
    });

    test('resolves with concat strategy for arrays', () => {
      const r = new ConflictResolver({ fieldStrategies: { tags: 'concat' } });
      const { merged } = r.resolve(
        { tags: ['a'] },
        { tags: ['a', 'b'] },
        { tags: ['a', 'c'] },
      );
      expect(merged.tags).toContain('b');
      expect(merged.tags).toContain('c');
    });

    test('resolves with concat strategy for strings', () => {
      const r = new ConflictResolver({ fieldStrategies: { notes: 'concat' } });
      const { merged } = r.resolve(
        { notes: 'base' },
        { notes: 'local note' },
        { notes: 'remote note' },
      );
      expect(merged.notes).toContain('local note');
      expect(merged.notes).toContain('remote note');
    });

    test('resolves with field-merge for nested objects', () => {
      const r = new ConflictResolver({ fieldStrategies: { config: 'field-merge' } });
      const { merged } = r.resolve(
        { config: { a: 1, b: 2 } },
        { config: { a: 10, b: 2 } },
        { config: { a: 1, b: 20 } },
      );
      expect(merged.config.a).toBe(10);
      expect(merged.config.b).toBe(20);
    });

    test('per-field strategy overrides default', () => {
      const r = new ConflictResolver({
        defaultStrategy: 'local-wins',
        fieldStrategies: { version: 'max' },
      });
      const { merged } = r.resolve(
        { title: 'T', version: 1 },
        { title: 'Local', version: 3 },
        { title: 'Remote', version: 5 },
      );
      expect(merged.title).toBe('Local'); // local-wins
      expect(merged.version).toBe(5); // max
    });

    test('logs conflicts', () => {
      resolver.resolve({ x: 1 }, { x: 2 }, { x: 3 });
      const log = resolver.getConflictLog();
      expect(log.length).toBe(1);
      expect(log[0].fields).toContain('x');
    });
  });

  describe('stats', () => {
    test('getStats returns conflict counts', () => {
      resolver.resolve({ x: 1 }, { x: 2 }, { x: 3 });
      resolver.resolve({ y: 1, x: 1 }, { y: 2, x: 2 }, { y: 3, x: 3 });

      const stats = resolver.getStats();
      expect(stats.totalConflicts).toBe(2);
      expect(stats.fieldCounts.x).toBe(2);
      expect(stats.fieldCounts.y).toBe(1);
    });

    test('resetLog clears history', () => {
      resolver.resolve({ x: 1 }, { x: 2 }, { x: 3 });
      resolver.resetLog();
      expect(resolver.getConflictLog()).toEqual([]);
      expect(resolver.getStats().totalConflicts).toBe(0);
    });
  });
});
