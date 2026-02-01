'use strict';

/**
 * GYWD Multi-Agent System
 *
 * Multi-agent coordination, messaging, cloud sync, and team collaboration.
 */

const { MultiAgentCoordinator, COORDINATION_MODE, AGENT_ROLE } = require('./coordinator');
const { MessageQueue, MESSAGE_TYPE, MESSAGE_PRIORITY } = require('./message-queue');
const { CloudSyncManager, SYNC_STATUS, CONFLICT_STRATEGY } = require('./cloud-sync');
const { TeamSyncManager, TEAM_ROLE, SYNC_MODE } = require('./team-sync');

module.exports = {
  // Coordinator (Phase 33)
  MultiAgentCoordinator,
  COORDINATION_MODE,
  AGENT_ROLE,

  // Message Queue (Phase 34)
  MessageQueue,
  MESSAGE_TYPE,
  MESSAGE_PRIORITY,

  // Cloud Sync (Phase 35)
  CloudSyncManager,
  SYNC_STATUS,
  CONFLICT_STRATEGY,

  // Team Sync (Phase 36)
  TeamSyncManager,
  TEAM_ROLE,
  SYNC_MODE,
};
