import * as fs from 'fs';

jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock gywd-bridge
jest.mock('@/lib/gywd-bridge', () => ({
  getWatchPaths: jest.fn(() => ['/tmp/STATE.md', '/tmp/patterns.json']),
  parseState: jest.fn(() => ({ phase: { current: 43, total: 52 } })),
  getMemoryStats: jest.fn(() => ({ totalPatterns: 10 })),
}));

// Mock ws-client — not connected by default (local mode)
const mockOnEvent = jest.fn(() => jest.fn()); // returns unsubscribe
const mockIsConnected = jest.fn(() => false);

jest.mock('@/lib/ws-client', () => ({
  getWsClient: jest.fn(() => ({
    isConnected: mockIsConnected,
    onEvent: mockOnEvent,
  })),
}));

import { SSEManager } from '@/lib/sse-manager';

describe('SSEManager', () => {
  let manager: SSEManager;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockIsConnected.mockReturnValue(false);
    manager = new SSEManager();
    mockFs.existsSync.mockReturnValue(true);
    mockFs.watch.mockReturnValue({ close: jest.fn() } as unknown as fs.FSWatcher);
  });

  afterEach(() => {
    manager.stop();
    jest.useRealTimers();
  });

  describe('basic lifecycle', () => {
    it('starts with zero listeners', () => {
      expect(manager.getListenerCount()).toBe(0);
    });

    it('starts in idle mode', () => {
      expect(manager.getMode()).toBe('idle');
    });

    it('adds and removes listeners', () => {
      const listener = jest.fn();
      manager.addListener(listener);
      expect(manager.getListenerCount()).toBe(1);

      manager.removeListener(listener);
      expect(manager.getListenerCount()).toBe(0);
    });

    it('auto-stops when last listener is removed', () => {
      const listener = jest.fn();
      manager.addListener(listener);
      manager.removeListener(listener);
      expect(manager.getMode()).toBe('idle');
    });
  });

  describe('local mode (gateway unavailable)', () => {
    it('starts in local mode when gateway is not connected', () => {
      const listener = jest.fn();
      manager.addListener(listener);
      expect(manager.getMode()).toBe('local');
    });

    it('watches files in local mode', () => {
      const listener = jest.fn();
      manager.addListener(listener);
      expect(mockFs.watch).toHaveBeenCalled();
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

      watchCallback?.();
      watchCallback?.();
      watchCallback?.();

      expect(listener).not.toHaveBeenCalledWith('state_changed', expect.anything());

      jest.advanceTimersByTime(250);

      const stateChangeCalls = listener.mock.calls.filter(
        (call: [string, unknown]) => call[0] === 'state_changed',
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

  describe('gateway mode', () => {
    it('starts in gateway mode when WS client is connected', () => {
      mockIsConnected.mockReturnValue(true);

      const listener = jest.fn();
      manager.addListener(listener);

      expect(manager.getMode()).toBe('gateway');
      // Should NOT watch files in gateway mode
      expect(mockFs.watch).not.toHaveBeenCalled();
    });

    it('subscribes to WS client events in gateway mode', () => {
      mockIsConnected.mockReturnValue(true);

      const listener = jest.fn();
      manager.addListener(listener);

      expect(mockOnEvent).toHaveBeenCalled();
    });

    it('forwards WS events to listeners', () => {
      mockIsConnected.mockReturnValue(true);

      let wsCallback: ((event: { event: string; data: unknown; timestamp: string }) => void) | null = null;
      mockOnEvent.mockImplementation((cb: typeof wsCallback) => {
        wsCallback = cb;
        return jest.fn();
      });

      const listener = jest.fn();
      manager.addListener(listener);

      // Simulate gateway WS event
      wsCallback?.({ event: 'state_changed', data: { phase: 54 }, timestamp: '2026-01-01' });

      expect(listener).toHaveBeenCalledWith('state_changed', { phase: 54 });
    });

    it('filters out gateway_connected internal events', () => {
      mockIsConnected.mockReturnValue(true);

      let wsCallback: ((event: { event: string; data: unknown; timestamp: string }) => void) | null = null;
      mockOnEvent.mockImplementation((cb: typeof wsCallback) => {
        wsCallback = cb;
        return jest.fn();
      });

      const listener = jest.fn();
      manager.addListener(listener);

      wsCallback?.({ event: 'gateway_connected', data: {}, timestamp: '2026-01-01' });

      // Should not be forwarded
      const calls = listener.mock.calls.filter(
        (call: [string, unknown]) => call[0] === 'gateway_connected',
      );
      expect(calls.length).toBe(0);
    });
  });

  describe('event buffer', () => {
    it('buffers events for replay', () => {
      const listener = jest.fn();
      manager.addListener(listener);

      // Trigger events via file change
      let watchCallback: (() => void) | undefined;
      mockFs.watch.mockImplementation((_path: fs.PathLike, cb: unknown) => {
        if ((_path as string).includes('STATE.md')) {
          watchCallback = cb as () => void;
        }
        return { close: jest.fn() } as unknown as fs.FSWatcher;
      });

      // Restart to pick up new mock
      manager.stop();
      manager = new SSEManager();
      manager.addListener(listener);

      watchCallback?.();
      jest.advanceTimersByTime(250);

      const buffered = manager.getBufferedEvents(0);
      expect(buffered.length).toBeGreaterThanOrEqual(1);
    });

    it('replays events to a new listener', () => {
      mockIsConnected.mockReturnValue(true);

      let wsCallback: ((event: { event: string; data: unknown; timestamp: string }) => void) | null = null;
      mockOnEvent.mockImplementation((cb: typeof wsCallback) => {
        wsCallback = cb;
        return jest.fn();
      });

      const listener1 = jest.fn();
      manager.addListener(listener1);

      // Send some events
      wsCallback?.({ event: 'state_changed', data: { a: 1 }, timestamp: '2026-01-01' });
      wsCallback?.({ event: 'patterns_updated', data: { b: 2 }, timestamp: '2026-01-01' });

      // Late-joining listener gets replay
      const lateListener = jest.fn();
      const replayed = manager.replayTo(lateListener, 0);

      expect(replayed).toBe(2);
      expect(lateListener).toHaveBeenCalledTimes(2);
    });

    it('respects buffer size limit', () => {
      mockIsConnected.mockReturnValue(true);

      let wsCallback: ((event: { event: string; data: unknown; timestamp: string }) => void) | null = null;
      mockOnEvent.mockImplementation((cb: typeof wsCallback) => {
        wsCallback = cb;
        return jest.fn();
      });

      const listener = jest.fn();
      manager.addListener(listener);

      // Send more than buffer size
      for (let i = 0; i < 60; i++) {
        wsCallback?.({ event: 'test', data: { i }, timestamp: '2026-01-01' });
      }

      const buffered = manager.getBufferedEvents(0);
      expect(buffered.length).toBeLessThanOrEqual(50);
    });
  });

  describe('mode switching', () => {
    it('attempts gateway upgrade from local mode', () => {
      // Start in local mode
      const listener = jest.fn();
      manager.addListener(listener);
      expect(manager.getMode()).toBe('local');

      // WS client onEvent should have been called for upgrade monitoring
      expect(mockOnEvent).toHaveBeenCalled();
    });
  });
});
