'use strict';

/**
 * SSE Client for Claude-Mem Worker
 *
 * Connects to claude-mem worker's SSE stream endpoint for real-time
 * observation notifications. Handles auto-reconnection with exponential backoff.
 *
 * @module sse-client
 */

const { EventEmitter } = require('events');
const http = require('http');

/**
 * SSE connection states
 */
const CONNECTION_STATE = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error'
};

/**
 * SSE Client for claude-mem worker
 * @extends EventEmitter
 *
 * Events emitted:
 * - 'connected' - Successfully connected
 * - 'disconnected' - Connection closed
 * - 'reconnecting' - Attempting reconnection (with attempt number)
 * - 'error' - Connection error
 * - 'observation_queued' - New observation queued
 * - 'session_completed' - Session finished processing
 * - 'processing_status' - Processing status update
 * - 'new_prompt' - New user prompt
 */
class SSEClient extends EventEmitter {
  /**
   * Create SSE client
   * @param {Object} options - Configuration options
   * @param {string} options.host - Worker host (default: 127.0.0.1)
   * @param {number} options.port - Worker port (default: 37777)
   * @param {number} options.maxReconnectAttempts - Max reconnection attempts (default: 10)
   * @param {number} options.baseReconnectDelay - Base delay for reconnection in ms (default: 1000)
   */
  constructor(options = {}) {
    super();

    this.host = options.host || '127.0.0.1';
    this.port = options.port || 37777;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.baseReconnectDelay = options.baseReconnectDelay || 1000;

    this.state = CONNECTION_STATE.DISCONNECTED;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.request = null;
    this.buffer = '';
  }

  /**
   * Get the SSE stream URL
   * @returns {string}
   */
  getStreamUrl() {
    return `http://${this.host}:${this.port}/stream`;
  }

  /**
   * Connect to SSE stream
   * @returns {Promise<void>}
   */
  connect() {
    return new Promise((resolve, reject) => {
      if (this.state === CONNECTION_STATE.CONNECTED) {
        resolve();
        return;
      }

      this.state = CONNECTION_STATE.CONNECTING;

      const url = new URL(this.getStreamUrl());

      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      };

      this.request = http.request(options, (response) => {
        if (response.statusCode !== 200) {
          const error = new Error(`SSE connection failed: HTTP ${response.statusCode}`);
          this.state = CONNECTION_STATE.ERROR;
          this.emit('error', error);
          reject(error);
          return;
        }

        this.state = CONNECTION_STATE.CONNECTED;
        this.reconnectAttempts = 0;
        this.emit('connected');
        resolve();

        // Handle incoming data
        response.on('data', (chunk) => {
          this._handleData(chunk.toString());
        });

        // Handle connection close
        response.on('end', () => {
          this._handleDisconnect();
        });

        response.on('error', (error) => {
          this.state = CONNECTION_STATE.ERROR;
          this.emit('error', error);
          this._scheduleReconnect();
        });
      });

      this.request.on('error', (error) => {
        this.state = CONNECTION_STATE.ERROR;
        this.emit('error', error);

        if (this.state === CONNECTION_STATE.CONNECTING) {
          reject(error);
        } else {
          this._scheduleReconnect();
        }
      });

      this.request.end();
    });
  }

  /**
   * Disconnect from SSE stream
   */
  disconnect() {
    this._clearReconnectTimer();

    if (this.request) {
      this.request.destroy();
      this.request = null;
    }

    this.state = CONNECTION_STATE.DISCONNECTED;
    this.buffer = '';
    this.emit('disconnected');
  }

  /**
   * Handle incoming SSE data
   * @private
   */
  _handleData(chunk) {
    this.buffer += chunk;

    // SSE events are separated by double newlines
    const events = this.buffer.split('\n\n');

    // Keep incomplete event in buffer
    this.buffer = events.pop() || '';

    for (const event of events) {
      if (event.trim()) {
        this._parseEvent(event);
      }
    }
  }

  /**
   * Parse SSE event
   * @private
   */
  _parseEvent(eventString) {
    const lines = eventString.split('\n');
    let eventType = 'message';
    let data = '';

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        data += line.slice(5).trim();
      }
    }

    if (data) {
      try {
        const parsed = JSON.parse(data);
        this._dispatchEvent(parsed.type || eventType, parsed);
      } catch {
        // Non-JSON data, emit as raw message
        this.emit('message', { type: eventType, data });
      }
    }
  }

  /**
   * Dispatch parsed SSE event
   * @private
   */
  _dispatchEvent(eventType, data) {
    // Emit specific event type
    this.emit(eventType, data);

    // Also emit generic 'event' for logging/debugging
    this.emit('event', { type: eventType, data });
  }

  /**
   * Handle disconnection
   * @private
   */
  _handleDisconnect() {
    if (this.state === CONNECTION_STATE.DISCONNECTED) {
      return; // Already handled
    }

    this.state = CONNECTION_STATE.DISCONNECTED;
    this.emit('disconnected');
    this._scheduleReconnect();
  }

  /**
   * Schedule reconnection with exponential backoff
   * @private
   */
  _scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('error', new Error('Max reconnection attempts reached'));
      return;
    }

    this._clearReconnectTimer();

    this.reconnectAttempts++;
    this.state = CONNECTION_STATE.RECONNECTING;

    // Exponential backoff with jitter
    const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    const jitter = Math.random() * 1000;
    const totalDelay = Math.min(delay + jitter, 60000); // Cap at 60 seconds

    this.emit('reconnecting', this.reconnectAttempts);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch {
        // connect() will call _scheduleReconnect on failure
      }
    }, totalDelay);
  }

  /**
   * Clear reconnection timer
   * @private
   */
  _clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Get connection state
   * @returns {string}
   */
  getState() {
    return this.state;
  }

  /**
   * Check if connected
   * @returns {boolean}
   */
  isConnected() {
    return this.state === CONNECTION_STATE.CONNECTED;
  }

  /**
   * Get connection stats
   * @returns {Object}
   */
  getStats() {
    return {
      state: this.state,
      reconnectAttempts: this.reconnectAttempts,
      host: this.host,
      port: this.port
    };
  }
}

module.exports = { SSEClient, CONNECTION_STATE };
