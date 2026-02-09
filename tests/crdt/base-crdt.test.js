'use strict';

const { GCounter, PNCounter, LWWRegister, ORSet } = require('../../lib/crdt/base-crdt');

describe('GCounter', () => {
  test('starts at zero', () => {
    const c = new GCounter('node1');
    expect(c.value()).toBe(0);
  });

  test('increments locally', () => {
    const c = new GCounter('node1');
    c.increment();
    c.increment(5);
    expect(c.value()).toBe(6);
  });

  test('rejects negative increment', () => {
    const c = new GCounter('node1');
    expect(() => c.increment(-1)).toThrow('can only increment');
  });

  test('merges take max per node', () => {
    const a = new GCounter('node1');
    const b = new GCounter('node2');

    a.increment(3);
    b.increment(5);

    a.merge(b);
    expect(a.value()).toBe(8); // 3 + 5

    // If b increments more and merges again
    b.increment(2);
    a.merge(b);
    expect(a.value()).toBe(10); // 3 + 7
  });

  test('merge is idempotent', () => {
    const a = new GCounter('node1');
    const b = new GCounter('node2');
    a.increment(3);
    b.increment(5);

    a.merge(b);
    a.merge(b);
    a.merge(b);
    expect(a.value()).toBe(8);
  });

  test('export and import preserve state', () => {
    const c = new GCounter('node1');
    c.increment(10);
    const state = c.export();
    const restored = GCounter.fromState(state);
    expect(restored.value()).toBe(10);
    expect(restored.nodeId).toBe('node1');
  });
});

describe('PNCounter', () => {
  test('starts at zero', () => {
    const c = new PNCounter('node1');
    expect(c.value()).toBe(0);
  });

  test('increments and decrements', () => {
    const c = new PNCounter('node1');
    c.increment(5);
    c.decrement(2);
    expect(c.value()).toBe(3);
  });

  test('can go negative', () => {
    const c = new PNCounter('node1');
    c.decrement(3);
    expect(c.value()).toBe(-3);
  });

  test('merges correctly across nodes', () => {
    const a = new PNCounter('node1');
    const b = new PNCounter('node2');

    a.increment(10);
    b.increment(5);
    b.decrement(3);

    a.merge(b);
    expect(a.value()).toBe(12); // 10 + 5 - 3
  });

  test('export and import', () => {
    const c = new PNCounter('node1');
    c.increment(7);
    c.decrement(2);
    const restored = PNCounter.fromState(c.export());
    expect(restored.value()).toBe(5);
  });
});

describe('LWWRegister', () => {
  test('starts with initial value', () => {
    const r = new LWWRegister('node1', 'hello');
    expect(r.value()).toBe('hello');
  });

  test('set updates value', () => {
    const r = new LWWRegister('node1');
    r.set('world');
    expect(r.value()).toBe('world');
    expect(r.timestamp()).toBeGreaterThan(0);
  });

  test('merge last writer wins', () => {
    const a = new LWWRegister('node1');
    const b = new LWWRegister('node2');

    a.setWithTimestamp('first', 100);
    b.setWithTimestamp('second', 200);

    a.merge(b);
    expect(a.value()).toBe('second'); // b wrote later
  });

  test('merge tie broken by node ID', () => {
    const a = new LWWRegister('node1');
    const b = new LWWRegister('node2');

    a.setWithTimestamp('from-a', 100);
    b.setWithTimestamp('from-b', 100); // Same timestamp

    a.merge(b);
    // node2 > node1, so b wins
    expect(a.value()).toBe('from-b');
  });

  test('export and import', () => {
    const r = new LWWRegister('node1');
    r.set('data');
    const restored = LWWRegister.fromState(r.export());
    expect(restored.value()).toBe('data');
    expect(restored.nodeId).toBe('node1');
  });
});

describe('ORSet', () => {
  test('starts empty', () => {
    const s = new ORSet('node1');
    expect(s.size()).toBe(0);
    expect(s.values()).toEqual([]);
  });

  test('add and check', () => {
    const s = new ORSet('node1');
    s.add('item1');
    s.add('item2');
    expect(s.has('item1')).toBe(true);
    expect(s.has('item2')).toBe(true);
    expect(s.has('item3')).toBe(false);
    expect(s.size()).toBe(2);
  });

  test('remove element', () => {
    const s = new ORSet('node1');
    s.add('item1');
    s.add('item2');
    s.remove('item1');
    expect(s.has('item1')).toBe(false);
    expect(s.has('item2')).toBe(true);
    expect(s.size()).toBe(1);
  });

  test('re-add after remove', () => {
    const s = new ORSet('node1');
    s.add('item1');
    s.remove('item1');
    expect(s.has('item1')).toBe(false);
    s.add('item1');
    expect(s.has('item1')).toBe(true);
  });

  test('merge adds from both sets', () => {
    const a = new ORSet('node1');
    const b = new ORSet('node2');

    a.add('x');
    b.add('y');

    a.merge(b);
    expect(a.has('x')).toBe(true);
    expect(a.has('y')).toBe(true);
    expect(a.size()).toBe(2);
  });

  test('merge respects remote removes', () => {
    const a = new ORSet('node1');
    const b = new ORSet('node2');

    a.add('item');
    b.merge(a); // b now has 'item'
    b.remove('item'); // b removes 'item'

    a.merge(b); // a should see the remove
    expect(a.has('item')).toBe(false);
  });

  test('concurrent add wins over remove (add-wins semantics)', () => {
    const a = new ORSet('node1');
    const b = new ORSet('node2');

    a.add('item');
    b.merge(a); // Both have 'item'

    // Concurrently: a removes, b re-adds
    a.remove('item');
    b.add('item'); // New tag, not yet seen by a

    a.merge(b);
    // b's new add has a tag that wasn't in a's tombstones
    expect(a.has('item')).toBe(true);
  });

  test('export and import', () => {
    const s = new ORSet('node1');
    s.add('a');
    s.add('b');
    s.remove('a');

    const restored = ORSet.fromState(s.export());
    expect(restored.has('a')).toBe(false);
    expect(restored.has('b')).toBe(true);
    expect(restored.nodeId).toBe('node1');
  });
});
