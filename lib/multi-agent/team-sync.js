'use strict';

/**
 * Team Sync
 *
 * Real-time collaboration and team pattern sharing.
 * Part of Phase 36: Team Collaboration.
 */

const { EventEmitter } = require('events');

/**
 * Team member roles
 */
const TEAM_ROLE = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
};

/**
 * Sync modes
 */
const SYNC_MODE = {
  REALTIME: 'realtime',
  MANUAL: 'manual',
  SCHEDULED: 'scheduled',
};

/**
 * Team Sync Manager
 */
class TeamSyncManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this.teamId = options.teamId || null;
    this.userId = options.userId || null;
    this.syncMode = options.syncMode || SYNC_MODE.MANUAL;
    this.members = new Map();
    this.sharedPatterns = [];
    this.sharedDecisions = [];
    this.activities = [];
    this.permissions = new Map();
  }

  /**
   * Create a new team
   * @param {string} teamName
   * @param {object} options
   * @returns {object}
   */
  createTeam(teamName, _options = {}) {
    this.teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Add creator as owner
    this.members.set(this.userId, {
      userId: this.userId,
      role: TEAM_ROLE.OWNER,
      joinedAt: Date.now(),
      lastActive: Date.now(),
    });

    this.permissions.set(this.userId, this._getDefaultPermissions(TEAM_ROLE.OWNER));

    this.emit('teamCreated', {
      teamId: this.teamId,
      name: teamName,
      createdBy: this.userId,
    });

    return {
      teamId: this.teamId,
      name: teamName,
      owner: this.userId,
    };
  }

  /**
   * Join an existing team
   * @param {string} teamId
   * @param {string} inviteCode
   * @returns {Promise<boolean>}
   */
  async joinTeam(teamId, _inviteCode) {
    // Simulate invite validation
    await this._simulateNetwork(100);

    this.teamId = teamId;

    this.members.set(this.userId, {
      userId: this.userId,
      role: TEAM_ROLE.MEMBER,
      joinedAt: Date.now(),
      lastActive: Date.now(),
    });

    this.permissions.set(this.userId, this._getDefaultPermissions(TEAM_ROLE.MEMBER));

    this.emit('teamJoined', {
      teamId,
      userId: this.userId,
    });

    return true;
  }

  /**
   * Invite a member to the team
   * @param {string} email
   * @param {string} role
   * @returns {object}
   */
  inviteMember(email, role = TEAM_ROLE.MEMBER) {
    if (!this._hasPermission(this.userId, 'invite')) {
      throw new Error('No permission to invite members');
    }

    const inviteCode = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.emit('inviteSent', {
      teamId: this.teamId,
      email,
      role,
      inviteCode,
    });

    return {
      inviteCode,
      email,
      role,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    };
  }

  /**
   * Remove a member from the team
   * @param {string} userId
   */
  removeMember(userId) {
    if (!this._hasPermission(this.userId, 'remove')) {
      throw new Error('No permission to remove members');
    }

    const member = this.members.get(userId);

    if (member?.role === TEAM_ROLE.OWNER) {
      throw new Error('Cannot remove team owner');
    }

    this.members.delete(userId);
    this.permissions.delete(userId);

    this.emit('memberRemoved', {
      teamId: this.teamId,
      userId,
    });
  }

  /**
   * Share a pattern with the team
   * @param {object} pattern
   * @returns {object}
   */
  sharePattern(pattern) {
    if (!this._hasPermission(this.userId, 'share')) {
      throw new Error('No permission to share patterns');
    }

    const sharedPattern = {
      id: `pat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...pattern,
      sharedBy: this.userId,
      sharedAt: Date.now(),
      adoptedBy: [],
    };

    this.sharedPatterns.push(sharedPattern);
    this._recordActivity('pattern_shared', { patternId: sharedPattern.id });

    this.emit('patternShared', sharedPattern);

    return sharedPattern;
  }

  /**
   * Adopt a shared pattern
   * @param {string} patternId
   * @returns {object}
   */
  adoptPattern(patternId) {
    const pattern = this.sharedPatterns.find(p => p.id === patternId);

    if (!pattern) {
      throw new Error(`Pattern not found: ${patternId}`);
    }

    if (!pattern.adoptedBy.includes(this.userId)) {
      pattern.adoptedBy.push(this.userId);
    }

    this._recordActivity('pattern_adopted', { patternId, adoptedBy: this.userId });
    this.emit('patternAdopted', { patternId, userId: this.userId });

    return pattern;
  }

  /**
   * Share a decision with the team
   * @param {object} decision
   * @returns {object}
   */
  shareDecision(decision) {
    if (!this._hasPermission(this.userId, 'share')) {
      throw new Error('No permission to share decisions');
    }

    const sharedDecision = {
      id: `dec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...decision,
      sharedBy: this.userId,
      sharedAt: Date.now(),
      comments: [],
      votes: {},
    };

    this.sharedDecisions.push(sharedDecision);
    this._recordActivity('decision_shared', { decisionId: sharedDecision.id });

    this.emit('decisionShared', sharedDecision);

    return sharedDecision;
  }

  /**
   * Vote on a shared decision
   * @param {string} decisionId
   * @param {string} vote - 'approve', 'reject', 'abstain'
   * @param {string} comment
   */
  voteOnDecision(decisionId, vote, comment = '') {
    const decision = this.sharedDecisions.find(d => d.id === decisionId);

    if (!decision) {
      throw new Error(`Decision not found: ${decisionId}`);
    }

    decision.votes[this.userId] = {
      vote,
      comment,
      timestamp: Date.now(),
    };

    this._recordActivity('decision_voted', { decisionId, vote });
    this.emit('decisionVoted', { decisionId, userId: this.userId, vote });
  }

  /**
   * Get team activity feed
   * @param {number} limit
   * @returns {Array}
   */
  getActivityFeed(limit = 50) {
    return this.activities.slice(-limit).reverse();
  }

  /**
   * Get team analytics
   * @returns {object}
   */
  getAnalytics() {
    const memberCount = this.members.size;
    const patternCount = this.sharedPatterns.length;
    const decisionCount = this.sharedDecisions.length;

    const adoptionRate = patternCount > 0
      ? this.sharedPatterns.reduce((sum, p) => sum + p.adoptedBy.length, 0) / (patternCount * memberCount)
      : 0;

    const decisionParticipation = decisionCount > 0
      ? this.sharedDecisions.reduce((sum, d) => sum + Object.keys(d.votes).length, 0) / (decisionCount * memberCount)
      : 0;

    return {
      memberCount,
      patternCount,
      decisionCount,
      adoptionRate: Math.round(adoptionRate * 100),
      decisionParticipation: Math.round(decisionParticipation * 100),
      activitiesCount: this.activities.length,
      mostActiveMembers: this._getMostActiveMembers(5),
    };
  }

  /**
   * Get most active team members
   * @param {number} count
   * @returns {Array}
   */
  _getMostActiveMembers(count) {
    const activityCount = {};

    for (const activity of this.activities) {
      activityCount[activity.userId] = (activityCount[activity.userId] || 0) + 1;
    }

    return Object.entries(activityCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([userId, count]) => ({ userId, activityCount: count }));
  }

  /**
   * Record team activity
   * @param {string} type
   * @param {object} data
   */
  _recordActivity(type, data) {
    this.activities.push({
      type,
      data,
      userId: this.userId,
      timestamp: Date.now(),
    });

    // Update member's last active
    const member = this.members.get(this.userId);
    if (member) {
      member.lastActive = Date.now();
    }

    // Keep activities bounded
    if (this.activities.length > 1000) {
      this.activities = this.activities.slice(-1000);
    }
  }

  /**
   * Get default permissions for a role
   * @param {string} role
   * @returns {object}
   */
  _getDefaultPermissions(role) {
    const permissions = {
      [TEAM_ROLE.OWNER]: {
        invite: true,
        remove: true,
        share: true,
        admin: true,
        delete: true,
      },
      [TEAM_ROLE.ADMIN]: {
        invite: true,
        remove: true,
        share: true,
        admin: false,
        delete: false,
      },
      [TEAM_ROLE.MEMBER]: {
        invite: false,
        remove: false,
        share: true,
        admin: false,
        delete: false,
      },
      [TEAM_ROLE.VIEWER]: {
        invite: false,
        remove: false,
        share: false,
        admin: false,
        delete: false,
      },
    };

    return permissions[role] || permissions[TEAM_ROLE.VIEWER];
  }

  /**
   * Check if user has permission
   * @param {string} userId
   * @param {string} permission
   * @returns {boolean}
   */
  _hasPermission(userId, permission) {
    const perms = this.permissions.get(userId);
    return perms?.[permission] === true;
  }

  /**
   * Simulate network delay
   * @param {number} ms
   * @returns {Promise}
   */
  _simulateNetwork(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get team status
   * @returns {object}
   */
  getStatus() {
    return {
      teamId: this.teamId,
      userId: this.userId,
      memberCount: this.members.size,
      sharedPatterns: this.sharedPatterns.length,
      sharedDecisions: this.sharedDecisions.length,
      syncMode: this.syncMode,
      role: this.members.get(this.userId)?.role,
    };
  }
}

module.exports = {
  TeamSyncManager,
  TEAM_ROLE,
  SYNC_MODE,
};
