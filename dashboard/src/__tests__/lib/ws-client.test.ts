import { EventEmitter } from 'events';

// Track mock instances
const mockWsInstances: Array<EventEmitter & { readyState: number; close: jest.Mock; send: jest.Mock }> = [];

jest.mock('ws', () => {
  return class MockWs extends EventEmitter {
    readyState = 1;
    close = jest.fn(() => { this.readyState = 3; });
    send = jest.fn();

    constructor() {
      super();
      mockWsInstances.push(this as unknown as typeof mockWsInstances[0]);
      setTimeout(() => this.emit('open'), 0);
    }
  };
});

jest.mock('@/lib/config', () => ({
  getGatewayConfig: jest.fn(() => ({
    wsUrl: 'ws://localhost:3945/ws',
    httpUrl: 'http://localhost:3945',
    apiKey: null,
    authDisabled: true,
  })),
}));

import { getWsClient, resetWsClient, type WsEvent } from '@/lib/ws-client';

describe('GatewayWsClient', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockWsInstances.length = 0;
    resetWsClient();
  });

  afterEach(() => {
    resetWsClient();
    jest.useRealTimers();
  });

  it('creates a singleton instance', () => {
    const a = getWsClient();
    const b = getWsClient();
    expect(a).toBe(b);
  });

  it('connects to gateway WS', () => {
    getWsClient();
    expect(mockWsInstances.length).toBe(1);
  });

  it('emits gateway_connected on open', () => {
    const client = getWsClient();
    const events: WsEvent[] = [];
    client.onEvent((e) => events.push(e));

    jest.runAllTimers();

    expect(events.length).toBe(1);
    expect(events[0].event).toBe('gateway_connected');
  });

  it('forwards WS messages to listeners', () => {
    const client = getWsClient();
    const events: WsEvent[] = [];
    client.onEvent((e) => events.push(e));

    jest.runAllTimers(); // open event

    const msg: WsEvent = { event: 'state_changed', data: { phase: 54 }, timestamp: '2026-01-01' };
    mockWsInstances[0].emit('message', JSON.stringify(msg));

    expect(events.length).toBe(2);
    expect(events[1].event).toBe('state_changed');
    expect(events[1].data).toEqual({ phase: 54 });
  });

  it('buffers recent events', () => {
    const client = getWsClient();
    jest.runAllTimers();

    for (let i = 0; i < 5; i++) {
      const msg: WsEvent = { event: 'data_updated', data: { i }, timestamp: '2026-01-01' };
      mockWsInstances[0].emit('message', JSON.stringify(msg));
    }

    const recent = client.getRecentEvents(3);
    expect(recent.length).toBe(3);
    expect((recent[2].data as { i: number }).i).toBe(4);
  });

  it('reports connected status after open', () => {
    const client = getWsClient();
    expect(client.isConnected()).toBe(false);

    jest.runAllTimers();
    expect(client.isConnected()).toBe(true);
  });

  it('unsubscribes listeners', () => {
    const client = getWsClient();
    const events: WsEvent[] = [];
    const unsub = client.onEvent((e) => events.push(e));

    jest.runAllTimers();
    expect(events.length).toBe(1);

    unsub();

    const msg: WsEvent = { event: 'test', data: {}, timestamp: '2026-01-01' };
    mockWsInstances[0].emit('message', JSON.stringify(msg));

    expect(events.length).toBe(1);
  });

  it('ignores malformed messages', () => {
    const client = getWsClient();
    const events: WsEvent[] = [];
    client.onEvent((e) => events.push(e));
    jest.runAllTimers();

    mockWsInstances[0].emit('message', 'not json');

    expect(events.length).toBe(1);
  });

  it('reconnects on close', () => {
    getWsClient();
    jest.runAllTimers();
    expect(mockWsInstances.length).toBe(1);

    mockWsInstances[0].emit('close');
    jest.advanceTimersByTime(2000);

    expect(mockWsInstances.length).toBe(2);
  });

  it('resetWsClient closes and clears singleton', () => {
    const client = getWsClient();
    jest.runAllTimers();
    expect(client.isConnected()).toBe(true);

    resetWsClient();

    const client2 = getWsClient();
    expect(client2).not.toBe(client);
  });
});
