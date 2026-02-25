'use strict';

/**
 * Role-Based Access Control (RBAC)
 *
 * Manages roles, permissions, and user-role assignments.
 * Built-in roles: admin, developer, viewer.
 * Supports custom roles and permission inheritance.
 */

/** Default role definitions */
const DEFAULT_ROLES = {
  admin: {
    name: 'Admin',
    description: 'Full access to all features',
    permissions: [
      'read', 'write', 'delete',
      'manage_users', 'manage_roles', 'manage_keys',
      'view_audit', 'export_data',
      'manage_plans', 'manage_decisions', 'resolve_decisions',
      'view_patterns', 'edit_patterns',
      'manage_plugins', 'manage_settings',
    ],
  },
  developer: {
    name: 'Developer',
    description: 'Can read, write, and manage plans',
    permissions: [
      'read', 'write',
      'manage_plans', 'manage_decisions',
      'view_patterns', 'edit_patterns',
      'view_audit',
    ],
  },
  viewer: {
    name: 'Viewer',
    description: 'Read-only access',
    permissions: [
      'read',
      'view_patterns',
      'view_audit',
    ],
  },
};

class RBAC {
  constructor() {
    /** @type {Map<string, Role>} */
    this.roles = new Map();
    /** @type {Map<string, UserRoleAssignment>} */
    this.assignments = new Map();

    // Initialize default roles
    for (const [id, role] of Object.entries(DEFAULT_ROLES)) {
      this.roles.set(id, { id, ...role, builtIn: true });
    }
  }

  // ---- Role Management ----

  /**
   * Create a custom role
   * @param {string} id - Role identifier
   * @param {string} name - Display name
   * @param {string[]} permissions - Permission strings
   * @param {string} [description]
   * @returns {Role}
   */
  createRole(id, name, permissions, description = '') {
    if (this.roles.has(id)) {
      throw new Error(`Role ${id} already exists`);
    }
    const role = { id, name, description, permissions: [...permissions], builtIn: false };
    this.roles.set(id, role);
    return role;
  }

  /**
   * Delete a custom role (cannot delete built-in roles)
   * @param {string} roleId
   * @returns {boolean}
   */
  deleteRole(roleId) {
    const role = this.roles.get(roleId);
    if (!role) return false;
    if (role.builtIn) throw new Error('Cannot delete built-in role');
    // Remove all assignments for this role
    for (const [userId, assignment] of this.assignments) {
      if (assignment.roles.includes(roleId)) {
        assignment.roles = assignment.roles.filter(r => r !== roleId);
        if (assignment.roles.length === 0) {
          this.assignments.delete(userId);
        }
      }
    }
    return this.roles.delete(roleId);
  }

  /**
   * Get a role
   * @param {string} roleId
   * @returns {Role|null}
   */
  getRole(roleId) {
    return this.roles.get(roleId) || null;
  }

  /**
   * List all roles
   * @returns {Role[]}
   */
  listRoles() {
    return [...this.roles.values()];
  }

  /**
   * Add a permission to a role
   * @param {string} roleId
   * @param {string} permission
   */
  addPermissionToRole(roleId, permission) {
    const role = this.roles.get(roleId);
    if (!role) throw new Error(`Role ${roleId} not found`);
    if (!role.permissions.includes(permission)) {
      role.permissions.push(permission);
    }
  }

  /**
   * Remove a permission from a role
   * @param {string} roleId
   * @param {string} permission
   */
  removePermissionFromRole(roleId, permission) {
    const role = this.roles.get(roleId);
    if (!role) throw new Error(`Role ${roleId} not found`);
    role.permissions = role.permissions.filter(p => p !== permission);
  }

  // ---- User Assignment ----

  /**
   * Assign a role to a user
   * @param {string} userId
   * @param {string} roleId
   * @returns {{ success: boolean, message: string }}
   */
  assignRole(userId, roleId) {
    if (!this.roles.has(roleId)) {
      return { success: false, message: `Role ${roleId} not found` };
    }
    let assignment = this.assignments.get(userId);
    if (!assignment) {
      assignment = { userId, roles: [], assignedAt: Date.now() };
      this.assignments.set(userId, assignment);
    }
    if (assignment.roles.includes(roleId)) {
      return { success: false, message: `User already has role ${roleId}` };
    }
    assignment.roles.push(roleId);
    return { success: true, message: `Role ${roleId} assigned to ${userId}` };
  }

  /**
   * Revoke a role from a user
   * @param {string} userId
   * @param {string} roleId
   * @returns {boolean}
   */
  revokeRole(userId, roleId) {
    const assignment = this.assignments.get(userId);
    if (!assignment) return false;
    const idx = assignment.roles.indexOf(roleId);
    if (idx === -1) return false;
    assignment.roles.splice(idx, 1);
    if (assignment.roles.length === 0) {
      this.assignments.delete(userId);
    }
    return true;
  }

  /**
   * Get a user's roles
   * @param {string} userId
   * @returns {string[]}
   */
  getUserRoles(userId) {
    const assignment = this.assignments.get(userId);
    return assignment ? [...assignment.roles] : [];
  }

  /**
   * Get all effective permissions for a user (union of all role permissions)
   * @param {string} userId
   * @returns {string[]}
   */
  getUserPermissions(userId) {
    const roles = this.getUserRoles(userId);
    const permSet = new Set();
    for (const roleId of roles) {
      const role = this.roles.get(roleId);
      if (role) {
        for (const perm of role.permissions) {
          permSet.add(perm);
        }
      }
    }
    return [...permSet];
  }

  // ---- Permission Checking ----

  /**
   * Check if a user has a specific permission
   * @param {string} userId
   * @param {string} permission
   * @returns {boolean}
   */
  hasPermission(userId, permission) {
    return this.getUserPermissions(userId).includes(permission);
  }

  /**
   * Check if a user has ALL of the given permissions
   * @param {string} userId
   * @param {string[]} permissions
   * @returns {boolean}
   */
  hasAllPermissions(userId, permissions) {
    const userPerms = new Set(this.getUserPermissions(userId));
    return permissions.every(p => userPerms.has(p));
  }

  /**
   * Check if a user has ANY of the given permissions
   * @param {string} userId
   * @param {string[]} permissions
   * @returns {boolean}
   */
  hasAnyPermission(userId, permissions) {
    const userPerms = new Set(this.getUserPermissions(userId));
    return permissions.some(p => userPerms.has(p));
  }

  /**
   * Enforce a permission check (throws on failure)
   * @param {string} userId
   * @param {string} permission
   * @param {string} [action] - Description for error message
   */
  enforce(userId, permission, action) {
    if (!this.hasPermission(userId, permission)) {
      const desc = action ? ` to ${action}` : '';
      throw new Error(`Access denied: user ${userId} lacks permission '${permission}'${desc}`);
    }
  }

  // ---- Stats ----

  /**
   * Get RBAC statistics
   * @returns {{ totalRoles: number, totalAssignments: number, builtInRoles: number, customRoles: number }}
   */
  getStats() {
    let builtIn = 0, custom = 0;
    for (const role of this.roles.values()) {
      if (role.builtIn) builtIn++;
      else custom++;
    }
    return {
      totalRoles: this.roles.size,
      totalAssignments: this.assignments.size,
      builtInRoles: builtIn,
      customRoles: custom,
    };
  }

  /**
   * List users with a specific role
   * @param {string} roleId
   * @returns {string[]} User IDs
   */
  getUsersByRole(roleId) {
    const users = [];
    for (const [userId, assignment] of this.assignments) {
      if (assignment.roles.includes(roleId)) {
        users.push(userId);
      }
    }
    return users;
  }
}

/**
 * @typedef {object} Role
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string[]} permissions
 * @property {boolean} builtIn
 */

/**
 * @typedef {object} UserRoleAssignment
 * @property {string} userId
 * @property {string[]} roles
 * @property {number} assignedAt
 */

module.exports = { RBAC, DEFAULT_ROLES };
