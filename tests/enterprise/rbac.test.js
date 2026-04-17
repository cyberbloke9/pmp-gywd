'use strict';

const { RBAC, DEFAULT_ROLES, DEFAULT_PERMISSIONS } = require('../../lib/enterprise/rbac');

describe('RBAC', () => {
  let rbac;
  const ROOT = 'root-bootstrap';

  beforeEach(() => {
    rbac = new RBAC({ rootUserId: ROOT });
  });

  describe('default roles', () => {
    test('has admin, developer, viewer roles', () => {
      expect(rbac.getRole('admin')).not.toBeNull();
      expect(rbac.getRole('developer')).not.toBeNull();
      expect(rbac.getRole('viewer')).not.toBeNull();
    });

    test('admin has all permissions', () => {
      const admin = rbac.getRole('admin');
      expect(admin.permissions).toContain('read');
      expect(admin.permissions).toContain('write');
      expect(admin.permissions).toContain('delete');
      expect(admin.permissions).toContain('manage_users');
    });

    test('viewer has read-only permissions', () => {
      const viewer = rbac.getRole('viewer');
      expect(viewer.permissions).toContain('read');
      expect(viewer.permissions).not.toContain('write');
      expect(viewer.permissions).not.toContain('delete');
    });

    test('default roles are marked as built-in', () => {
      expect(rbac.getRole('admin').builtIn).toBe(true);
    });

    test('cannot delete built-in roles', () => {
      expect(() => rbac.deleteRole(ROOT, 'admin')).toThrow('Cannot delete built-in');
    });
  });

  describe('custom roles', () => {
    test('createRole adds a new role', () => {
      rbac.createRole(ROOT, 'tester', 'Tester', ['read', 'view_patterns'], 'QA role');
      expect(rbac.getRole('tester').name).toBe('Tester');
      expect(rbac.getRole('tester').builtIn).toBe(false);
    });

    test('createRole rejects duplicate ID', () => {
      rbac.createRole(ROOT, 'x', 'X', ['read']);
      expect(() => rbac.createRole(ROOT, 'x', 'X', ['read'])).toThrow(/already exists/);
    });

    test('createRole rejects wildcard permissions', () => {
      expect(() => rbac.createRole(ROOT, 'evil', 'Evil', ['*']))
        .toThrow(/wildcard/);
      expect(() => rbac.createRole(ROOT, 'evil2', 'Evil', ['role.*']))
        .toThrow(/wildcard/);
    });

    test('createRole rejects unregistered permissions', () => {
      expect(() => rbac.createRole(ROOT, 'x', 'X', ['fake_perm']))
        .toThrow(/not registered/);
    });

    test('deleteRole removes a custom role', () => {
      rbac.createRole(ROOT, 'x', 'X', ['read']);
      expect(rbac.deleteRole(ROOT, 'x')).toBe(true);
      expect(rbac.getRole('x')).toBeNull();
    });

    test('cannot modify built-in roles', () => {
      expect(() => rbac.addPermissionToRole(ROOT, 'admin', 'read')).toThrow(/built-in/);
      expect(() => rbac.removePermissionFromRole(ROOT, 'admin', 'read')).toThrow(/built-in/);
    });
  });

  describe('authorization gating', () => {
    test('createRole requires manage_roles', () => {
      expect(() => rbac.createRole('unauth-user', 'x', 'X', ['read']))
        .toThrow(/Access denied/);
    });

    test('deleteRole requires manage_roles', () => {
      rbac.createRole(ROOT, 'x', 'X', ['read']);
      expect(() => rbac.deleteRole('unauth-user', 'x'))
        .toThrow(/Access denied/);
    });

    test('assignRole requires manage_users', () => {
      expect(() => rbac.assignRole('unauth-user', 'someone', 'viewer'))
        .toThrow(/Access denied/);
    });

    test('revokeRole requires manage_users', () => {
      rbac.assignRole(ROOT, 'alice', 'viewer');
      expect(() => rbac.revokeRole('unauth-user', 'alice', 'viewer'))
        .toThrow(/Access denied/);
    });

    test('addPermissionToRole requires manage_roles', () => {
      rbac.createRole(ROOT, 'x', 'X', ['read']);
      expect(() => rbac.addPermissionToRole('unauth', 'x', 'write'))
        .toThrow(/Access denied/);
    });

    test('user with manage_users can call assignRole', () => {
      // Root assigns an admin role (which has manage_users) to alice
      rbac.assignRole(ROOT, 'alice', 'admin');
      // Now alice can assign
      expect(rbac.assignRole('alice', 'bob', 'viewer').success).toBe(true);
    });

    test('user without manage_users cannot self-grant admin', () => {
      rbac.assignRole(ROOT, 'viewer-user', 'viewer');
      expect(() => rbac.assignRole('viewer-user', 'viewer-user', 'admin'))
        .toThrow(/Access denied/);
    });

    test('missing callerUserId is rejected', () => {
      expect(() => rbac.createRole('', 'x', 'X', ['read'])).toThrow(/callerUserId required/);
      expect(() => rbac.createRole(null, 'x', 'X', ['read'])).toThrow(/callerUserId required/);
    });
  });

  describe('user assignment', () => {
    test('assignRole grants a role', () => {
      const result = rbac.assignRole(ROOT, 'user1', 'viewer');
      expect(result.success).toBe(true);
      expect(rbac.getUserRoles('user1')).toContain('viewer');
    });

    test('assignRole rejects unknown role', () => {
      expect(rbac.assignRole(ROOT, 'user1', 'nonexistent').success).toBe(false);
    });

    test('assignRole is idempotent', () => {
      rbac.assignRole(ROOT, 'user1', 'viewer');
      expect(rbac.assignRole(ROOT, 'user1', 'viewer').success).toBe(false);
    });

    test('revokeRole removes a role', () => {
      rbac.assignRole(ROOT, 'user1', 'viewer');
      expect(rbac.revokeRole(ROOT, 'user1', 'viewer')).toBe(true);
      expect(rbac.getUserRoles('user1')).toEqual([]);
    });

    test('deleteRole removes user assignments', () => {
      rbac.createRole(ROOT, 'tmp', 'Temp', ['read']);
      rbac.assignRole(ROOT, 'u1', 'tmp');
      rbac.deleteRole(ROOT, 'tmp');
      expect(rbac.getUserRoles('u1')).toEqual([]);
    });
  });

  describe('permission checks', () => {
    test('hasPermission returns true when user has it', () => {
      rbac.assignRole(ROOT, 'user1', 'developer');
      expect(rbac.hasPermission('user1', 'write')).toBe(true);
    });

    test('hasPermission returns false when user lacks it', () => {
      rbac.assignRole(ROOT, 'user1', 'viewer');
      expect(rbac.hasPermission('user1', 'write')).toBe(false);
    });

    test('hasAllPermissions requires all', () => {
      rbac.assignRole(ROOT, 'u', 'admin');
      expect(rbac.hasAllPermissions('u', ['read', 'write', 'delete'])).toBe(true);
      expect(rbac.hasAllPermissions('u', ['read', 'nonexistent'])).toBe(false);
    });

    test('hasAnyPermission requires at least one', () => {
      rbac.assignRole(ROOT, 'u', 'viewer');
      expect(rbac.hasAnyPermission('u', ['write', 'read'])).toBe(true);
      expect(rbac.hasAnyPermission('u', ['write', 'delete'])).toBe(false);
    });

    test('enforce throws on denied', () => {
      rbac.assignRole(ROOT, 'u', 'viewer');
      expect(() => rbac.enforce('u', 'delete')).toThrow(/Access denied/);
    });

    test('enforce does not throw when allowed', () => {
      rbac.assignRole(ROOT, 'u', 'admin');
      expect(() => rbac.enforce('u', 'delete')).not.toThrow();
    });

    test('root bypasses all permission checks', () => {
      expect(rbac.hasPermission(ROOT, 'any_permission_at_all')).toBe(true);
      expect(rbac.hasAllPermissions(ROOT, ['read', 'write'])).toBe(true);
    });
  });

  describe('deny semantics (deny wins over grant)', () => {
    test('role-level deny overrides allow', () => {
      rbac.createRole(ROOT, 'restricted', 'Restricted', ['read', 'write'], '', ['write']);
      rbac.assignRole(ROOT, 'u', 'restricted');
      expect(rbac.hasPermission('u', 'read')).toBe(true);
      expect(rbac.hasPermission('u', 'write')).toBe(false); // denied
    });

    test('multi-role: deny in one overrides grant in another', () => {
      rbac.createRole(ROOT, 'no-delete', 'NoDelete', [], '', ['delete']);
      rbac.assignRole(ROOT, 'u', 'admin');
      rbac.assignRole(ROOT, 'u', 'no-delete');
      // Admin grants delete, but no-delete role denies it → deny wins
      expect(rbac.hasPermission('u', 'delete')).toBe(false);
    });

    test('addDeniedPermissionToRole on custom role', () => {
      rbac.createRole(ROOT, 'x', 'X', ['read', 'write']);
      rbac.addDeniedPermissionToRole(ROOT, 'x', 'write');
      rbac.assignRole(ROOT, 'u', 'x');
      expect(rbac.hasPermission('u', 'write')).toBe(false);
    });
  });

  describe('permission registry', () => {
    test('registerPermission requires manage_roles', () => {
      expect(() => rbac.registerPermission('unauth', 'new_perm')).toThrow(/Access denied/);
    });

    test('registered permissions can be used in roles', () => {
      rbac.registerPermission(ROOT, 'custom_perm');
      rbac.createRole(ROOT, 'x', 'X', ['custom_perm']);
      expect(rbac.getRole('x').permissions).toContain('custom_perm');
    });

    test('listRegisteredPermissions returns all', () => {
      const perms = rbac.listRegisteredPermissions();
      expect(perms).toContain('read');
      expect(perms).toContain('manage_roles');
    });

    test('cannot register wildcards', () => {
      expect(() => rbac.registerPermission(ROOT, '*')).toThrow(/wildcard/);
    });
  });

  describe('stats', () => {
    test('getStats returns role counts', () => {
      const stats = rbac.getStats();
      expect(stats.totalRoles).toBe(3);
      expect(stats.builtInRoles).toBe(3);
      expect(stats.customRoles).toBe(0);
      expect(stats.registeredPermissions).toBeGreaterThan(10);
    });

    test('getUsersByRole lists users', () => {
      rbac.assignRole(ROOT, 'u1', 'viewer');
      rbac.assignRole(ROOT, 'u2', 'viewer');
      expect(rbac.getUsersByRole('viewer').sort()).toEqual(['u1', 'u2']);
    });
  });
});
