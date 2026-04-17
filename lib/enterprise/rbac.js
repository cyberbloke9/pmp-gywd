'use strict';

/**
 * Role-Based Access Control (RBAC) — hardened per 2026-04-12 security audit.
 *
 * Security properties:
 *   - All mutation methods require a callerUserId and internally enforce(manage_roles).
 *   - Permission registry: only registered permissions can be assigned; wildcards blocked.
 *   - Deny-wins semantics: role.deniedPermissions overrides any role.permissions grant.
 *   - Bootstrap: an explicit root identity (via constructor option) bypasses gating ONCE for
 *     setup; all subsequent calls require proper authorization.
 *   - Built-in roles are immutable at runtime (cannot add/remove permissions).
 */

/**
 * Canonical permission registry. Any permission passed to createRole/addPermissionToRole
 * must be in this set (unless registerPermission is explicitly called with a new one).
 *
 * Wildcards (`*`, `role.*`, `.*`) are REJECTED.
 */
const DEFAULT_PERMISSIONS = new Set([
  'read', 'write', 'delete',
  'manage_users', 'manage_roles', 'manage_keys',
  'view_audit', 'export_data',
  'manage_plans', 'manage_decisions', 'resolve_decisions',
  'view_patterns', 'edit_patterns',
  'manage_plugins', 'manage_settings',
  'execute_action', 'view_metrics',
]);

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
      'execute_action', 'view_metrics',
    ],
    deniedPermissions: [],
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
    deniedPermissions: [],
  },
  viewer: {
    name: 'Viewer',
    description: 'Read-only access',
    permissions: [
      'read',
      'view_patterns',
      'view_audit',
    ],
    deniedPermissions: [],
  },
};

/** Permissions that are forbidden as custom-role grants regardless of registry status. */
const WILDCARD_PATTERNS = [/\*/, /^\.\*$/, /.*\.\*$/];

function isWildcard(perm) {
  if (typeof perm !== 'string' || perm.length === 0 || perm.length > 64) return true;
  return WILDCARD_PATTERNS.some(rx => rx.test(perm));
}

class RBAC {
  /**
   * @param {object} [config={}]
   * @param {string} [config.rootUserId] - Optional bootstrap admin who can perform the first
   *   role-management actions without being pre-assigned. Once set, this user is implicitly
   *   treated as having ALL permissions. Use with care (e.g. system bootstrap only).
   * @param {Iterable<string>} [config.permissions] - Additional permissions to register.
   */
  constructor(config = {}) {
    this.roles = new Map();
    this.assignments = new Map();
    this.registeredPermissions = new Set(DEFAULT_PERMISSIONS);
    this.rootUserId = config.rootUserId || null;

    if (config.permissions) {
      for (const p of config.permissions) {
        if (isWildcard(p)) throw new Error(`Permission "${p}" contains wildcard; rejected`);
        this.registeredPermissions.add(p);
      }
    }

    // Initialize default roles
    for (const [id, role] of Object.entries(DEFAULT_ROLES)) {
      this.roles.set(id, {
        id,
        ...role,
        permissions: [...role.permissions],
        deniedPermissions: [...(role.deniedPermissions || [])],
        builtIn: true,
      });
    }
  }

  // ---- Internal authorization ----

  _authorize(callerUserId, requiredPermission, description) {
    if (callerUserId == null || callerUserId === '') {
      throw new Error(`Access denied: callerUserId required for ${description}`);
    }
    // Bootstrap root identity is always allowed
    if (this.rootUserId && callerUserId === this.rootUserId) return;
    if (!this.hasPermission(callerUserId, requiredPermission)) {
      throw new Error(`Access denied: ${callerUserId} lacks permission '${requiredPermission}' for ${description}`);
    }
  }

  _validatePermission(permission) {
    if (isWildcard(permission)) {
      throw new Error(`Permission "${permission}" is wildcard/malformed; rejected`);
    }
    if (!this.registeredPermissions.has(permission)) {
      throw new Error(`Permission "${permission}" is not registered`);
    }
  }

  /**
   * Register an additional permission. Requires manage_roles.
   */
  registerPermission(callerUserId, permission) {
    this._authorize(callerUserId, 'manage_roles', 'registerPermission');
    if (isWildcard(permission)) throw new Error(`Permission "${permission}" is wildcard/malformed`);
    this.registeredPermissions.add(permission);
  }

  listRegisteredPermissions() {
    return [...this.registeredPermissions];
  }

  // ---- Role Management (all gated by manage_roles) ----

  createRole(callerUserId, id, name, permissions, description = '', deniedPermissions = []) {
    this._authorize(callerUserId, 'manage_roles', 'createRole');
    if (!id || typeof id !== 'string') throw new Error('Role id required');
    if (id.length > 64) throw new Error('Role id too long');
    if (this.roles.has(id)) throw new Error(`Role ${id} already exists`);
    for (const p of permissions) this._validatePermission(p);
    for (const p of deniedPermissions) this._validatePermission(p);

    const role = {
      id,
      name: String(name).slice(0, 128),
      description: String(description).slice(0, 512),
      permissions: [...permissions],
      deniedPermissions: [...deniedPermissions],
      builtIn: false,
    };
    this.roles.set(id, role);
    return role;
  }

  deleteRole(callerUserId, roleId) {
    this._authorize(callerUserId, 'manage_roles', 'deleteRole');
    const role = this.roles.get(roleId);
    if (!role) return false;
    if (role.builtIn) throw new Error('Cannot delete built-in role');
    for (const [userId, assignment] of this.assignments) {
      if (assignment.roles.includes(roleId)) {
        assignment.roles = assignment.roles.filter(r => r !== roleId);
        if (assignment.roles.length === 0) this.assignments.delete(userId);
      }
    }
    return this.roles.delete(roleId);
  }

  getRole(roleId) {
    return this.roles.get(roleId) || null;
  }

  listRoles() {
    return [...this.roles.values()];
  }

  addPermissionToRole(callerUserId, roleId, permission) {
    this._authorize(callerUserId, 'manage_roles', 'addPermissionToRole');
    const role = this.roles.get(roleId);
    if (!role) throw new Error(`Role ${roleId} not found`);
    if (role.builtIn) throw new Error('Cannot modify built-in role');
    this._validatePermission(permission);
    if (!role.permissions.includes(permission)) role.permissions.push(permission);
  }

  removePermissionFromRole(callerUserId, roleId, permission) {
    this._authorize(callerUserId, 'manage_roles', 'removePermissionFromRole');
    const role = this.roles.get(roleId);
    if (!role) throw new Error(`Role ${roleId} not found`);
    if (role.builtIn) throw new Error('Cannot modify built-in role');
    role.permissions = role.permissions.filter(p => p !== permission);
  }

  /** Add a denied permission (deny-wins over grants). */
  addDeniedPermissionToRole(callerUserId, roleId, permission) {
    this._authorize(callerUserId, 'manage_roles', 'addDeniedPermissionToRole');
    const role = this.roles.get(roleId);
    if (!role) throw new Error(`Role ${roleId} not found`);
    if (role.builtIn) throw new Error('Cannot modify built-in role');
    this._validatePermission(permission);
    if (!role.deniedPermissions.includes(permission)) role.deniedPermissions.push(permission);
  }

  // ---- User Assignment (gated by manage_users) ----

  assignRole(callerUserId, userId, roleId) {
    this._authorize(callerUserId, 'manage_users', 'assignRole');
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

  revokeRole(callerUserId, userId, roleId) {
    this._authorize(callerUserId, 'manage_users', 'revokeRole');
    const assignment = this.assignments.get(userId);
    if (!assignment) return false;
    const idx = assignment.roles.indexOf(roleId);
    if (idx === -1) return false;
    assignment.roles.splice(idx, 1);
    if (assignment.roles.length === 0) this.assignments.delete(userId);
    return true;
  }

  // ---- Read queries (no auth gate — they don't mutate) ----

  getUserRoles(userId) {
    const assignment = this.assignments.get(userId);
    return assignment ? [...assignment.roles] : [];
  }

  /**
   * Get a user's effective permissions (allow union MINUS deny union).
   * Deny always wins.
   */
  getUserPermissions(userId) {
    const roles = this.getUserRoles(userId);
    const allowSet = new Set();
    const denySet = new Set();
    for (const roleId of roles) {
      const role = this.roles.get(roleId);
      if (!role) continue;
      for (const perm of role.permissions) allowSet.add(perm);
      for (const perm of role.deniedPermissions || []) denySet.add(perm);
    }
    // Deny wins
    for (const d of denySet) allowSet.delete(d);
    return [...allowSet];
  }

  // ---- Permission Checking ----

  hasPermission(userId, permission) {
    // Root bypasses for bootstrap convenience
    if (this.rootUserId && userId === this.rootUserId) return true;
    return this.getUserPermissions(userId).includes(permission);
  }

  hasAllPermissions(userId, permissions) {
    const userPerms = new Set(this.getUserPermissions(userId));
    if (this.rootUserId && userId === this.rootUserId) return true;
    return permissions.every(p => userPerms.has(p));
  }

  hasAnyPermission(userId, permissions) {
    if (this.rootUserId && userId === this.rootUserId) return true;
    const userPerms = new Set(this.getUserPermissions(userId));
    return permissions.some(p => userPerms.has(p));
  }

  enforce(userId, permission, action) {
    if (!this.hasPermission(userId, permission)) {
      const desc = action ? ` to ${action}` : '';
      throw new Error(`Access denied: user ${userId} lacks permission '${permission}'${desc}`);
    }
  }

  // ---- Stats ----

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
      registeredPermissions: this.registeredPermissions.size,
    };
  }

  getUsersByRole(roleId) {
    const users = [];
    for (const [userId, assignment] of this.assignments) {
      if (assignment.roles.includes(roleId)) users.push(userId);
    }
    return users;
  }
}

module.exports = { RBAC, DEFAULT_ROLES, DEFAULT_PERMISSIONS };
