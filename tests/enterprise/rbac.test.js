'use strict';

const { RBAC, DEFAULT_ROLES } = require('../../lib/enterprise/rbac');

describe('RBAC', () => {
  let rbac;

  beforeEach(() => {
    rbac = new RBAC();
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
      expect(() => rbac.deleteRole('admin')).toThrow('Cannot delete built-in');
    });
  });

  describe('custom roles', () => {
    test('createRole adds a new role', () => {
      rbac.createRole('tester', 'Tester', ['read', 'view_patterns'], 'QA role');
      expect(rbac.getRole('tester').name).toBe('Tester');
      expect(rbac.getRole('tester').builtIn).toBe(false);
    });

    test('createRole rejects duplicate ID', () => {
      expect(() => rbac.createRole('admin', 'Admin2', [])).toThrow('already exists');
    });

    test('deleteRole removes custom role', () => {
      rbac.createRole('temp', 'Temp', []);
      expect(rbac.deleteRole('temp')).toBe(true);
      expect(rbac.getRole('temp')).toBeNull();
    });

    test('deleteRole cleans up assignments', () => {
      rbac.createRole('temp', 'Temp', ['read']);
      rbac.assignRole('user1', 'temp');
      rbac.deleteRole('temp');
      expect(rbac.getUserRoles('user1')).toEqual([]);
    });

    test('addPermissionToRole', () => {
      rbac.createRole('custom', 'C', ['read']);
      rbac.addPermissionToRole('custom', 'write');
      expect(rbac.getRole('custom').permissions).toContain('write');
    });

    test('removePermissionFromRole', () => {
      rbac.createRole('custom', 'C', ['read', 'write']);
      rbac.removePermissionFromRole('custom', 'write');
      expect(rbac.getRole('custom').permissions).not.toContain('write');
    });
  });

  describe('user assignments', () => {
    test('assignRole assigns role to user', () => {
      const result = rbac.assignRole('user1', 'developer');
      expect(result.success).toBe(true);
      expect(rbac.getUserRoles('user1')).toEqual(['developer']);
    });

    test('assignRole rejects unknown role', () => {
      const result = rbac.assignRole('user1', 'nonexistent');
      expect(result.success).toBe(false);
    });

    test('assignRole rejects duplicate assignment', () => {
      rbac.assignRole('user1', 'developer');
      const result = rbac.assignRole('user1', 'developer');
      expect(result.success).toBe(false);
      expect(result.message).toContain('already has');
    });

    test('user can have multiple roles', () => {
      rbac.assignRole('user1', 'developer');
      rbac.assignRole('user1', 'viewer');
      expect(rbac.getUserRoles('user1')).toContain('developer');
      expect(rbac.getUserRoles('user1')).toContain('viewer');
    });

    test('revokeRole removes role', () => {
      rbac.assignRole('user1', 'developer');
      expect(rbac.revokeRole('user1', 'developer')).toBe(true);
      expect(rbac.getUserRoles('user1')).toEqual([]);
    });

    test('revokeRole returns false for unassigned', () => {
      expect(rbac.revokeRole('user1', 'admin')).toBe(false);
    });
  });

  describe('permission checks', () => {
    beforeEach(() => {
      rbac.assignRole('admin1', 'admin');
      rbac.assignRole('dev1', 'developer');
      rbac.assignRole('viewer1', 'viewer');
    });

    test('getUserPermissions returns union of role permissions', () => {
      const perms = rbac.getUserPermissions('admin1');
      expect(perms).toContain('manage_users');
      expect(perms).toContain('read');
    });

    test('hasPermission checks correctly', () => {
      expect(rbac.hasPermission('admin1', 'delete')).toBe(true);
      expect(rbac.hasPermission('viewer1', 'delete')).toBe(false);
      expect(rbac.hasPermission('dev1', 'write')).toBe(true);
    });

    test('hasAllPermissions requires all', () => {
      expect(rbac.hasAllPermissions('admin1', ['read', 'write', 'delete'])).toBe(true);
      expect(rbac.hasAllPermissions('viewer1', ['read', 'write'])).toBe(false);
    });

    test('hasAnyPermission requires at least one', () => {
      expect(rbac.hasAnyPermission('viewer1', ['read', 'write'])).toBe(true);
      expect(rbac.hasAnyPermission('viewer1', ['delete', 'manage_users'])).toBe(false);
    });

    test('enforce throws on missing permission', () => {
      expect(() => rbac.enforce('viewer1', 'delete', 'remove plan')).toThrow('Access denied');
    });

    test('enforce passes for valid permission', () => {
      expect(() => rbac.enforce('admin1', 'delete')).not.toThrow();
    });

    test('unassigned user has no permissions', () => {
      expect(rbac.getUserPermissions('nobody')).toEqual([]);
      expect(rbac.hasPermission('nobody', 'read')).toBe(false);
    });
  });

  describe('stats', () => {
    test('getStats returns counts', () => {
      rbac.assignRole('user1', 'admin');
      const stats = rbac.getStats();
      expect(stats.totalRoles).toBe(3); // 3 built-in
      expect(stats.builtInRoles).toBe(3);
      expect(stats.customRoles).toBe(0);
      expect(stats.totalAssignments).toBe(1);
    });

    test('getUsersByRole returns user IDs', () => {
      rbac.assignRole('u1', 'developer');
      rbac.assignRole('u2', 'developer');
      rbac.assignRole('u3', 'admin');
      expect(rbac.getUsersByRole('developer')).toEqual(['u1', 'u2']);
    });

    test('listRoles returns all roles', () => {
      rbac.createRole('custom', 'Custom', []);
      expect(rbac.listRoles().length).toBe(4);
    });
  });

  test('DEFAULT_ROLES export matches expected structure', () => {
    expect(DEFAULT_ROLES.admin.permissions).toBeInstanceOf(Array);
    expect(DEFAULT_ROLES.developer.permissions).toBeInstanceOf(Array);
    expect(DEFAULT_ROLES.viewer.permissions).toBeInstanceOf(Array);
  });
});
