'use strict';

/**
 * SSE Client Tests
 */

const { SSEClient, CONNECTION_STATE } = require('../../../lib/plugins/claude-mem-integration/sse-client');
const { EventEmitter } = require('events');

describe('SSEClient', () => {
  let client;

  beforeEach(() => {
    client = new SSEClient({
      host: '127.0.0.1',
      port: 37777,
      maxReconnectAttempts: 3,
      baseReconnectDelay: 100,
    });
  });

  afterEach(() => {
    if (client) {
      client.disconnect();
    }
  });

  describe('constructor', () => {
    it('should use default options when not provided', () => {
      const defaultClient = new SSEClient();
      expect(defaultClient.host).toBe('127.0.0.1');
      expect(defaultClient.port).toBe(37777);
      expect(defaultClient.maxReconnectAttempts).toBe(10);
      expect(defaultClient.baseReconnectDelay).toBe(1000);
      defaultClient.disconnect();
    });

    it('should use custom options when provided', () => {
      expect(client.host).toBe('127.0.0.1');
      expect(client.port).toBe(37777);
      expect(client.maxReconnectAttempts).toBe(3);
      expect(client.baseReconnectDelay).toBe(100);
    });

    it('should initialize in disconnected state', () => {
      expect(client.state).toBe(CONNECTION_STATE.DISCONNECTED);
      expect(client.reconnectAttempts).toBe(0);
    });

    it('should extend EventEmitter', () => {
      expect(client).toBeInstanceOf(EventEmitter);
    });
  });

  describe('getStreamUrl', () => {
    it('should return correct stream URL', () => {
      expect(client.getStreamUrl()).toBe('http://127.0.0.1:37777/stream');
    });

    it('should use custom host and port', () => {
      const customClient = new SSEClient({ host: 'localhost', port: 8080 });
      expect(customClient.getStreamUrl()).toBe('http://localhost:8080/stream');
      customClient.disconnect();
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      expect(client.getState()).toBe(CONNECTION_STATE.DISCONNECTED);
    });
  });

  describe('isConnected', () => {
    it('should return false when disconnected', () => {
      expect(client.isConnected()).toBe(false);
    });

    it('should return false when in error state', () => {
      client.state = CONNECTION_STATE.ERROR;
      expect(client.isConnected()).toBe(false);
    });

    it('should return true when connected', () => {
      client.state = CONNECTION_STATE.CONNECTED;
      expect(client.isConnected()).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return connection stats', () => {
      const stats = client.getStats();
      expect(stats).toEqual({
        state: CONNECTION_STATE.DISCONNECTED,
        reconnectAttempts: 0,
        host: '127.0.0.1',
        port: 37777,
      });
    });

    it('should reflect reconnect attempts', () => {
      client.reconnectAttempts = 3;
      client.state = CONNECTION_STATE.RECONNECTING;
      const stats = client.getStats();
      expect(stats.reconnectAttempts).toBe(3);
      expect(stats.state).toBe(CONNECTION_STATE.RECONNECTING);
    });
  });

  describe('disconnect', () => {
    it('should set state to disconnected', () => {
      client.state = CONNECTION_STATE.CONNECTED;
      client.disconnect();
      expect(client.state).toBe(CONNECTION_STATE.DISCONNECTED);
    });

    it('should clear buffer', () => {
      client.buffer = 'some data';
      client.disconnect();
      expect(client.buffer).toBe('');
    });

    it('should emit disconnected event', (done) => {
      client.on('disconnected', () => {
        done();
      });
      client.disconnect();
    });

    it('should clear reconnect timer', () => {
      client.reconnectTimer = setTimeout(() => {}, 10000);
      client.disconnect();
      expect(client.reconnectTimer).toBeNull();
    });
  });

  describe('_handleData', () => {
    it('should buffer incomplete events', () => {
      client._handleData('event:test\n');
      expect(client.buffer).toBe('event:test\n');
    });

    it('should parse complete events', () => {
      const events = [];
      client.on('test', (data) => events.push(data));

      client._handleData('event:test\ndata:{"type":"test","value":1}\n\n');

      expect(events.length).toBe(1);
      expect(events[0]).toEqual({ type: 'test', value: 1 });
    });

    it('should handle multiple events in single chunk', () => {
      const events = [];
      client.on('event', (data) => events.push(data));

      client._handleData('event:a\ndata:{"type":"a"}\n\nevent:b\ndata:{"type":"b"}\n\n');

      expect(events.length).toBe(2);
    });

    it('should handle events split across chunks', () => {
      const events = [];
      client.on('test', (data) => events.push(data));

      client._handleData('event:test\n');
      client._handleData('data:{"type":"test"}\n\n');

      expect(events.length).toBe(1);
    });
  });

  describe('_parseEvent', () => {
    it('should parse event type and data', () => {
      const events = [];
      client.on('observation_queued', (data) => events.push(data));

      client._parseEvent('event:observation_queued\ndata:{"id":123}');

      expect(events.length).toBe(1);
      expect(events[0]).toEqual({ id: 123 });
    });

    it('should default to message event type', () => {
      const events = [];
      client.on('message', (data) => events.push(data));

      // Non-JSON data with no event type
      client._parseEvent('data:plain text');

      expect(events.length).toBe(1);
    });

    it('should handle JSON parse errors gracefully', () => {
      const messages = [];
      client.on('message', (data) => messages.push(data));

      client._parseEvent('data:not valid json');

      expect(messages.length).toBe(1);
      expect(messages[0].data).toBe('not valid json');
    });

    it('should use type from data if present', () => {
      const events = [];
      client.on('custom_type', (data) => events.push(data));

      client._parseEvent('event:ignored\ndata:{"type":"custom_type","value":1}');

      expect(events.length).toBe(1);
    });
  });

  describe('_dispatchEvent', () => {
    it('should emit specific event type', () => {
      const events = [];
      client.on('observation_queued', (data) => events.push(data));

      client._dispatchEvent('observation_queued', { id: 1 });

      expect(events.length).toBe(1);
    });

    it('should also emit generic event', () => {
      const genericEvents = [];
      client.on('event', (data) => genericEvents.push(data));

      client._dispatchEvent('observation_queued', { id: 1 });

      expect(genericEvents.length).toBe(1);
      expect(genericEvents[0].type).toBe('observation_queued');
    });
  });

  describe('_scheduleReconnect', () => {
    it('should not reconnect if max attempts reached', (done) => {
      client.reconnectAttempts = 3; // maxReconnectAttempts is 3

      client.on('error', (error) => {
        expect(error.message).toBe('Max reconnection attempts reached');
        done();
      });

      client._scheduleReconnect();
    });

    it('should emit reconnecting event with attempt number', (done) => {
      client.on('reconnecting', (attempt) => {
        expect(attempt).toBe(1);
        client.disconnect(); // Stop further reconnection
        done();
      });

      client._scheduleReconnect();
    });

    it('should increment reconnect attempts', () => {
      expect(client.reconnectAttempts).toBe(0);
      client._scheduleReconnect();
      expect(client.reconnectAttempts).toBe(1);
      client.disconnect(); // Cleanup
    });

    it('should set state to reconnecting', () => {
      client._scheduleReconnect();
      expect(client.state).toBe(CONNECTION_STATE.RECONNECTING);
      client.disconnect(); // Cleanup
    });
  });

  describe('CONNECTION_STATE', () => {
    it('should have all expected states', () => {
      expect(CONNECTION_STATE.DISCONNECTED).toBe('disconnected');
      expect(CONNECTION_STATE.CONNECTING).toBe('connecting');
      expect(CONNECTION_STATE.CONNECTED).toBe('connected');
      expect(CONNECTION_STATE.RECONNECTING).toBe('reconnecting');
      expect(CONNECTION_STATE.ERROR).toBe('error');
    });
  });
});
