'use strict';

const { HookManager } = require('../../lib/hooks/hook-manager');

describe('HookManager security (H4)', () => {
  let manager;

  beforeEach(() => {
    manager = new HookManager();
  });

  test('rejects non-string pattern', () => {
    expect(() => manager.register('pre_command', () => {}, { pattern: {} }))
      .toThrow(/must be a string/);
  });

  test('rejects oversized pattern', () => {
    const big = 'a'.repeat(500);
    expect(() => manager.register('pre_command', () => {}, { pattern: big }))
      .toThrow(/too long/);
  });

  test('rejects invalid regex', () => {
    expect(() => manager.register('pre_command', () => {}, { pattern: '([unclosed' }))
      .toThrow(/invalid regex/);
  });

  test('rejects nested quantifier patterns (ReDoS)', () => {
    expect(() => manager.register('pre_command', () => {}, { pattern: '(a+)+' }))
      .toThrow(/catastrophic backtracking/);
    expect(() => manager.register('pre_command', () => {}, { pattern: '(.+)+' }))
      .toThrow(/catastrophic backtracking/);
    expect(() => manager.register('pre_command', () => {}, { pattern: '(.*)*' }))
      .toThrow(/catastrophic backtracking/);
  });

  test('accepts safe patterns', () => {
    expect(() => manager.register('pre_command', () => {}, { pattern: '^test' })).not.toThrow();
    expect(() => manager.register('pre_command', () => {}, { pattern: 'word\\s+\\d+' })).not.toThrow();
  });

  test('precompiles pattern (same compiled regex used across triggers)', async () => {
    let called = 0;
    manager.register('pre_command', () => { called += 1; }, { pattern: '^run' });
    await manager.trigger('pre_command', { command: 'run something' });
    await manager.trigger('pre_command', { command: 'skip this' });
    expect(called).toBe(1);
  });

  test('truncates pathological input for pattern match', async () => {
    // If an attacker sends a 100MB command, we truncate to 1024 chars before matching
    const huge = 'x'.repeat(10 * 1024 * 1024); // 10MB
    manager.register('pre_command', () => {}, { pattern: '^y' });
    const start = Date.now();
    await manager.trigger('pre_command', { command: huge });
    const duration = Date.now() - start;
    // Must complete quickly — regex runs on truncated input, not 10MB
    expect(duration).toBeLessThan(1000);
  });
});
