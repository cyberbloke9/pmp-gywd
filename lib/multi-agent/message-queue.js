'use strict';

/**
 * Message Queue
 *
 * Inter-agent messaging system with pub/sub and task delegation.
 * Part of Phase 34: Agent Communication.
 */

const { EventEmitter } = require('events');

/**
 * Message types
 */
const MESSAGE_TYPE = {
  COMMAND: 'command',
  REQUEST: 'request',
  RESPONSE: 'response',
  EVENT: 'event',
  BROADCAST: 'broadcast',
};

/**
 * Message priority
 */
const MESSAGE_PRIORITY = {
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
};

/**
 * Message Queue class
 */
class MessageQueue extends EventEmitter {
  constructor(options = {}) {
    super();

    this.queues = new Map();          // Per-agent queues
    this.topics = new Map();          // Topic subscriptions
    this.pendingResponses = new Map(); // Pending request/response pairs
    this.messageHistory = [];
    this.maxHistorySize = options.maxHistorySize || 1000;
    this.defaultTimeout = options.defaultTimeout || 30000;
  }

  /**
   * Create a queue for an agent
   * @param {string} agentId
   * @param {object} options
   */
  createQueue(agentId, options = {}) {
    if (!this.queues.has(agentId)) {
      this.queues.set(agentId, {
        messages: [],
        maxSize: options.maxSize || 100,
        created: Date.now(),
      });
      this.emit('queueCreated', { agentId });
    }
  }

  /**
   * Delete an agent's queue
   * @param {string} agentId
   */
  deleteQueue(agentId) {
    this.queues.delete(agentId);
    this.emit('queueDeleted', { agentId });
  }

  /**
   * Send a message to an agent
   * @param {string} from
   * @param {string} to
   * @param {object} payload
   * @param {object} options
   * @returns {object}
   */
  send(from, to, payload, options = {}) {
    const message = this._createMessage(from, to, payload, options);

    if (!this.queues.has(to)) {
      this.createQueue(to);
    }

    const queue = this.queues.get(to);

    // Insert by priority
    const insertIndex = queue.messages.findIndex(m => m.priority > message.priority);
    if (insertIndex === -1) {
      queue.messages.push(message);
    } else {
      queue.messages.splice(insertIndex, 0, message);
    }

    // Trim if over max size
    if (queue.messages.length > queue.maxSize) {
      queue.messages.shift();
    }

    this._recordMessage(message);
    this.emit('messageSent', message);

    return message;
  }

  /**
   * Send a request and wait for response
   * @param {string} from
   * @param {string} to
   * @param {object} payload
   * @param {object} options
   * @returns {Promise<object>}
   */
  async request(from, to, payload, options = {}) {
    const message = this.send(from, to, payload, {
      ...options,
      type: MESSAGE_TYPE.REQUEST,
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingResponses.delete(message.id);
        reject(new Error(`Request timeout: ${message.id}`));
      }, options.timeout || this.defaultTimeout);

      this.pendingResponses.set(message.id, {
        resolve: (response) => {
          clearTimeout(timeout);
          resolve(response);
        },
        reject,
        timeout,
      });
    });
  }

  /**
   * Send a response to a request
   * @param {string} from
   * @param {string} requestId
   * @param {object} payload
   */
  respond(from, requestId, payload) {
    const pending = this.pendingResponses.get(requestId);

    if (pending) {
      pending.resolve({
        requestId,
        from,
        payload,
        timestamp: Date.now(),
      });
      this.pendingResponses.delete(requestId);
    }
  }

  /**
   * Receive messages from queue
   * @param {string} agentId
   * @param {number} count - Max messages to receive
   * @returns {Array}
   */
  receive(agentId, count = 1) {
    const queue = this.queues.get(agentId);

    if (!queue) {
      return [];
    }

    const messages = queue.messages.splice(0, count);

    for (const message of messages) {
      message.receivedAt = Date.now();
      this.emit('messageReceived', message);
    }

    return messages;
  }

  /**
   * Peek at messages without removing
   * @param {string} agentId
   * @param {number} count
   * @returns {Array}
   */
  peek(agentId, count = 1) {
    const queue = this.queues.get(agentId);

    if (!queue) {
      return [];
    }

    return queue.messages.slice(0, count);
  }

  /**
   * Subscribe to a topic
   * @param {string} agentId
   * @param {string} topic
   */
  subscribe(agentId, topic) {
    if (!this.topics.has(topic)) {
      this.topics.set(topic, new Set());
    }

    this.topics.get(topic).add(agentId);
    this.emit('subscribed', { agentId, topic });
  }

  /**
   * Unsubscribe from a topic
   * @param {string} agentId
   * @param {string} topic
   */
  unsubscribe(agentId, topic) {
    const subscribers = this.topics.get(topic);

    if (subscribers) {
      subscribers.delete(agentId);
      this.emit('unsubscribed', { agentId, topic });
    }
  }

  /**
   * Publish to a topic
   * @param {string} from
   * @param {string} topic
   * @param {object} payload
   * @param {object} options
   * @returns {Array} Sent messages
   */
  publish(from, topic, payload, options = {}) {
    const subscribers = this.topics.get(topic);

    if (!subscribers || subscribers.size === 0) {
      return [];
    }

    const messages = [];

    for (const agentId of subscribers) {
      if (agentId !== from) { // Don't send to self
        const message = this.send(from, agentId, payload, {
          ...options,
          type: MESSAGE_TYPE.EVENT,
          topic,
        });
        messages.push(message);
      }
    }

    this.emit('published', { topic, from, subscriberCount: subscribers.size - 1 });
    return messages;
  }

  /**
   * Broadcast to all agents
   * @param {string} from
   * @param {object} payload
   * @param {object} options
   * @returns {Array}
   */
  broadcast(from, payload, options = {}) {
    const messages = [];

    for (const agentId of this.queues.keys()) {
      if (agentId !== from) {
        const message = this.send(from, agentId, payload, {
          ...options,
          type: MESSAGE_TYPE.BROADCAST,
        });
        messages.push(message);
      }
    }

    this.emit('broadcast', { from, recipientCount: messages.length });
    return messages;
  }

  /**
   * Create a message object
   * @param {string} from
   * @param {string} to
   * @param {object} payload
   * @param {object} options
   * @returns {object}
   */
  _createMessage(from, to, payload, options) {
    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: options.type || MESSAGE_TYPE.COMMAND,
      priority: options.priority ?? MESSAGE_PRIORITY.NORMAL,
      from,
      to,
      payload,
      topic: options.topic || null,
      replyTo: options.replyTo || null,
      timestamp: Date.now(),
      ttl: options.ttl || null,
      metadata: options.metadata || {},
    };
  }

  /**
   * Record message in history
   * @param {object} message
   */
  _recordMessage(message) {
    this.messageHistory.push({
      id: message.id,
      type: message.type,
      from: message.from,
      to: message.to,
      timestamp: message.timestamp,
    });

    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory = this.messageHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get queue status
   * @param {string} agentId
   * @returns {object}
   */
  getQueueStatus(agentId) {
    const queue = this.queues.get(agentId);

    if (!queue) {
      return null;
    }

    return {
      agentId,
      messageCount: queue.messages.length,
      maxSize: queue.maxSize,
      created: queue.created,
      oldestMessage: queue.messages[0]?.timestamp || null,
      newestMessage: queue.messages[queue.messages.length - 1]?.timestamp || null,
    };
  }

  /**
   * Get overall status
   * @returns {object}
   */
  getStatus() {
    return {
      queueCount: this.queues.size,
      topicCount: this.topics.size,
      pendingRequests: this.pendingResponses.size,
      totalMessages: Array.from(this.queues.values()).reduce((sum, q) => sum + q.messages.length, 0),
      historySize: this.messageHistory.length,
    };
  }

  /**
   * Clear all queues
   */
  clear() {
    this.queues.clear();
    this.topics.clear();
    this.pendingResponses.clear();
    this.messageHistory = [];
    this.emit('cleared');
  }
}

module.exports = {
  MessageQueue,
  MESSAGE_TYPE,
  MESSAGE_PRIORITY,
};
