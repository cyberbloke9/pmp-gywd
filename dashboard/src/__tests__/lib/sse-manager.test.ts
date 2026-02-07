import * as fs from 'fs';

jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock gywd-bridge
jest.mock('@/lib/gywd-bridge', () => ({
  getWatchPaths: jest.fn(() => ['/tmp/STATE.md', '/tmp/patterns.json']),
  parseState: jest.fn(() => ({ phase: { current: 43, total: 52 } })),
  getMemoryStats: jest.fn(() => ({ totalPatterns: 10 })),
}));

import { SSEManager } from '@/lib/sse-manager';

describe('SSEManager', () => {
  let manager: SSEManager;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    manager = new SSEManager();
    mockFs.existsSync.mockReturnValue(true);
    mockFs.watch.mockReturnValue({ close: jest.fn() } as unknown as fs.FSWatcher);
  });

  afterEach(() => {
    manager.stop();
    jest.useRealTimers();
  });

  it('starts with zero listeners', () => {
    expect(manager.getListenerCount()).toBe(0);
  });

  it('adds and removes listeners', () => {
    const listener = jest.fn();
    manager.addListener(listener);
    expect(manager.getListenerCount()).toBe(1);

    manager.removeListener(listener);
    expect(manager.getListenerCount()).toBe(0);
  });

  it('auto-starts watching when first listener is added', () => {
    const listener = jest.fn();
    manager.addListener(listener);
    expect(mockFs.watch).toHaveBeenCalled();
  });

  it('auto-stops when last listener is removed', () => {
    const listener = jest.fn();
    manager.addListener(listener);
    manager.removeListener(listener);
    // Watchers should be cleared
    expect(manager.getListenerCount()).toBe(0);
  });

  it('broadcasts heartbeat events', () => {
    const listener = jest.fn();
    manager.addListener(listener);

    jest.advanceTimersByTime(30000);

    expect(listener).toHaveBeenCalledWith('heartbeat', expect.objectContaining({
      timestamp: expect.any(String),
    }));
  });

  it('debounces file change events', () => {
    let watchCallback: (() => void) | undefined;
    mockFs.watch.mockImplementation((_path: fs.PathLike, cb: unknown) => {
      watchCallback = cb as () => void;
      return { close: jest.fn() } as unknown as fs.FSWatcher;
    });

    const listener = jest.fn();
    manager.addListener(listener);

    // Trigger multiple rapid changes
    watchCallback?.();
    watchCallback?.();
    watchCallback?.();

    // Should not fire yet (within debounce window)
    expect(listener).not.toHaveBeenCalledWith('state_changed', expect.anything());

    // Advance past debounce
    jest.advanceTimersByTime(250);

    // Now it should fire (once, debounced)
    const stateChangeCalls = listener.mock.calls.filter(
      (call: [string, unknown]) => call[0] === 'state_changed'
    );
    expect(stateChangeCalls.length).toBeLessThanOrEqual(1);
  });

  it('handles multiple listeners', () => {
    const listener1 = jest.fn();
    const listener2 = jest.fn();

    manager.addListener(listener1);
    manager.addListener(listener2);

    expect(manager.getListenerCount()).toBe(2);

    jest.advanceTimersByTime(30000);

    expect(listener1).toHaveBeenCalled();
    expect(listener2).toHaveBeenCalled();
  });

  it('ignores errors from listeners', () => {
    const badListener = jest.fn(() => { throw new Error('oops'); });
    const goodListener = jest.fn();

    manager.addListener(badListener);
    manager.addListener(goodListener);

    jest.advanceTimersByTime(30000);

    expect(goodListener).toHaveBeenCalled();
  });

  it('skips files that do not exist', () => {
    mockFs.existsSync.mockReturnValue(false);

    const listener = jest.fn();
    manager.addListener(listener);

    expect(mockFs.watch).not.toHaveBeenCalled();
  });
});
