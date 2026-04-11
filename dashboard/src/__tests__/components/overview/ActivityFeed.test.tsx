import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock EventSource
class MockEventSource {
  static instances: MockEventSource[] = [];
  listeners: Record<string, ((e: { data: string }) => void)[]> = {};
  onerror: (() => void) | null = null;
  close = jest.fn();

  constructor(public url: string) {
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, cb: (e: { data: string }) => void) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(cb);
  }

  emit(type: string, data: unknown) {
    const handlers = this.listeners[type] || [];
    for (const h of handlers) {
      h({ data: JSON.stringify(data) });
    }
  }
}

(global as unknown as { EventSource: typeof MockEventSource }).EventSource = MockEventSource as unknown as typeof EventSource;

import ActivityFeed from '@/components/overview/ActivityFeed';

describe('ActivityFeed', () => {
  beforeEach(() => {
    MockEventSource.instances = [];
  });

  it('renders with connecting state', () => {
    render(<ActivityFeed />);
    expect(screen.getByText(/Connecting|Waiting/)).toBeInTheDocument();
  });

  it('creates an EventSource to /api/stream', () => {
    render(<ActivityFeed />);
    expect(MockEventSource.instances.length).toBe(1);
    expect(MockEventSource.instances[0].url).toBe('/api/stream');
  });

  it('shows connected state after connected event', () => {
    render(<ActivityFeed />);
    const es = MockEventSource.instances[0];

    act(() => {
      es.emit('connected', { timestamp: '2026-01-01T00:00:00Z', source: 'gateway' });
    });

    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('displays state_changed events', () => {
    render(<ActivityFeed />);
    const es = MockEventSource.instances[0];

    act(() => {
      es.emit('connected', { timestamp: '2026-01-01', source: 'local' });
      es.emit('state_changed', {
        state: { phase: { current: 54, total: 60 }, status: 'In Progress' },
        timestamp: '2026-01-01',
      });
    });

    expect(screen.getByText('State Changed')).toBeInTheDocument();
    expect(screen.getByText('Phase 54/60')).toBeInTheDocument();
  });

  it('displays command_executed events', () => {
    render(<ActivityFeed />);
    const es = MockEventSource.instances[0];

    act(() => {
      es.emit('connected', { timestamp: '2026-01-01', source: 'local' });
      es.emit('command_executed', {
        action: 'refresh-state',
        result: 'State refreshed',
        timestamp: '2026-01-01',
      });
    });

    expect(screen.getByText('Command Executed')).toBeInTheDocument();
    expect(screen.getByText('refresh-state')).toBeInTheDocument();
  });

  it('displays patterns_updated events', () => {
    render(<ActivityFeed />);
    const es = MockEventSource.instances[0];

    act(() => {
      es.emit('connected', { timestamp: '2026-01-01', source: 'local' });
      es.emit('patterns_updated', { count: 42, timestamp: '2026-01-01' });
    });

    expect(screen.getByText('Patterns Updated')).toBeInTheDocument();
    expect(screen.getByText('42 patterns')).toBeInTheDocument();
  });

  it('hides heartbeats by default', () => {
    render(<ActivityFeed />);
    const es = MockEventSource.instances[0];

    act(() => {
      es.emit('connected', { timestamp: '2026-01-01', source: 'local' });
      es.emit('heartbeat', { timestamp: '2026-01-01' });
    });

    expect(screen.queryByText('Heartbeat')).not.toBeInTheDocument();
  });

  it('cleans up EventSource on unmount', () => {
    const { unmount } = render(<ActivityFeed />);
    const es = MockEventSource.instances[0];

    unmount();

    expect(es.close).toHaveBeenCalled();
  });
});
