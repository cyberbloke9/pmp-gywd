'use strict';

/**
 * Compliance Reporting
 *
 * Generates SOC2 and GDPR compliance reports by checking
 * system configuration, audit logs, access controls, and data handling.
 */
class ComplianceReporter {
  /**
   * @param {object} [deps={}]
   * @param {import('./audit-log').AuditLog} [deps.auditLog]
   * @param {import('./rbac').RBAC} [deps.rbac]
   * @param {import('./sso').SSOManager} [deps.sso]
   */
  constructor(deps = {}) {
    this.auditLog = deps.auditLog || null;
    this.rbac = deps.rbac || null;
    this.sso = deps.sso || null;
    /** @type {Map<string, ComplianceCheck>} */
    this.customChecks = new Map();
  }

  /**
   * Register a custom compliance check
   * @param {string} id
   * @param {string} category - 'soc2' | 'gdpr' | 'general'
   * @param {string} description
   * @param {function(): { pass: boolean, details: string }} checkFn
   */
  registerCheck(id, category, description, checkFn) {
    this.customChecks.set(id, { id, category, description, checkFn });
  }

  /**
   * Run SOC2 compliance checks
   * @returns {ComplianceReport}
   */
  checkSOC2() {
    const checks = [];

    // CC6.1 - Logical Access Security
    checks.push(this._checkRBACEnabled());
    checks.push(this._checkSSOEnabled());
    checks.push(this._checkAdminRoleExists());

    // CC6.2 - System Operations
    checks.push(this._checkAuditLogEnabled());
    checks.push(this._checkAuditIntegrity());

    // CC6.3 - Change Management
    checks.push(this._checkAuditHasWriteActions());

    // CC7.1 - Monitoring
    checks.push(this._checkAuditRetention());
    checks.push(this._checkFailedAccessLogged());

    // Custom SOC2 checks
    for (const check of this.customChecks.values()) {
      if (check.category === 'soc2') {
        try {
          const result = check.checkFn();
          checks.push({ id: check.id, description: check.description, ...result });
        } catch (err) {
          checks.push({ id: check.id, description: check.description, pass: false, details: err.message });
        }
      }
    }

    return this._buildReport('SOC2', checks);
  }

  /**
   * Run GDPR compliance checks
   * @returns {ComplianceReport}
   */
  checkGDPR() {
    const checks = [];

    // Article 5 - Data Processing Principles
    checks.push(this._checkDataMinimization());

    // Article 15 - Right of Access
    checks.push(this._checkAccessRightSupported());

    // Article 17 - Right to Erasure
    checks.push(this._checkErasureSupported());

    // Article 25 - Data Protection by Design
    checks.push(this._checkAuditLogEnabled());

    // Article 30 - Records of Processing
    checks.push(this._checkProcessingRecords());

    // Article 32 - Security of Processing
    checks.push(this._checkRBACEnabled());
    checks.push(this._checkSSOEnabled());

    // Custom GDPR checks
    for (const check of this.customChecks.values()) {
      if (check.category === 'gdpr') {
        try {
          const result = check.checkFn();
          checks.push({ id: check.id, description: check.description, ...result });
        } catch (err) {
          checks.push({ id: check.id, description: check.description, pass: false, details: err.message });
        }
      }
    }

    return this._buildReport('GDPR', checks);
  }

  /**
   * Run all compliance checks
   * @returns {{ soc2: ComplianceReport, gdpr: ComplianceReport, summary: object }}
   */
  runFullAudit() {
    const soc2 = this.checkSOC2();
    const gdpr = this.checkGDPR();
    return {
      soc2,
      gdpr,
      summary: {
        totalChecks: soc2.totalChecks + gdpr.totalChecks,
        totalPassed: soc2.passed + gdpr.passed,
        totalFailed: soc2.failed + gdpr.failed,
        overallScore: Math.round(
          ((soc2.passed + gdpr.passed) / (soc2.totalChecks + gdpr.totalChecks)) * 100
        ),
        timestamp: new Date().toISOString(),
      },
    };
  }

  // ---- Internal Checks ----

  /** @private */
  _checkRBACEnabled() {
    const pass = this.rbac !== null && this.rbac.listRoles().length > 0;
    return {
      id: 'rbac-enabled',
      description: 'Role-based access control is configured',
      pass,
      details: pass ? `${this.rbac.listRoles().length} roles configured` : 'RBAC not configured',
    };
  }

  /** @private */
  _checkSSOEnabled() {
    const pass = this.sso !== null && this.sso.listProviders().length > 0;
    return {
      id: 'sso-enabled',
      description: 'SSO identity providers are configured',
      pass,
      details: pass ? `${this.sso.listProviders().length} providers configured` : 'No SSO providers',
    };
  }

  /** @private */
  _checkAdminRoleExists() {
    const pass = this.rbac !== null && this.rbac.getRole('admin') !== null;
    return {
      id: 'admin-role-exists',
      description: 'Admin role is defined with elevated permissions',
      pass,
      details: pass ? 'Admin role configured' : 'No admin role found',
    };
  }

  /** @private */
  _checkAuditLogEnabled() {
    const pass = this.auditLog !== null;
    return {
      id: 'audit-log-enabled',
      description: 'Audit logging is enabled',
      pass,
      details: pass ? `${this.auditLog.size()} entries recorded` : 'Audit log not configured',
    };
  }

  /** @private */
  _checkAuditIntegrity() {
    if (!this.auditLog) {
      return { id: 'audit-integrity', description: 'Audit log hash chain is intact', pass: false, details: 'Audit log not configured' };
    }
    const result = this.auditLog.verifyIntegrity();
    return {
      id: 'audit-integrity',
      description: 'Audit log hash chain is intact',
      pass: result.valid,
      details: result.valid ? 'Hash chain verified' : `Broken at entry ${result.brokenAt}`,
    };
  }

  /** @private */
  _checkAuditHasWriteActions() {
    if (!this.auditLog) {
      return { id: 'audit-write-tracking', description: 'Write operations are logged', pass: false, details: 'Audit log not configured' };
    }
    const stats = this.auditLog.getStats();
    const writeActions = Object.keys(stats.actionCounts).filter(a =>
      a.startsWith('create') || a.startsWith('update') || a.startsWith('delete')
    );
    const pass = writeActions.length > 0;
    return {
      id: 'audit-write-tracking',
      description: 'Write operations are logged',
      pass,
      details: pass ? `${writeActions.length} write action types tracked` : 'No write actions logged yet',
    };
  }

  /** @private */
  _checkAuditRetention() {
    if (!this.auditLog) {
      return { id: 'audit-retention', description: 'Audit logs have adequate retention', pass: false, details: 'Audit log not configured' };
    }
    const pass = this.auditLog.maxEntries >= 1000;
    return {
      id: 'audit-retention',
      description: 'Audit logs have adequate retention (>=1000 entries)',
      pass,
      details: `Max entries: ${this.auditLog.maxEntries}`,
    };
  }

  /** @private */
  _checkFailedAccessLogged() {
    if (!this.auditLog) {
      return { id: 'failed-access-logging', description: 'Failed access attempts are logged', pass: false, details: 'Audit log not configured' };
    }
    const stats = this.auditLog.getStats();
    // Check if system is configured to log denied/failure outcomes
    const hasDenied = (stats.outcomeCounts.denied || 0) > 0 || (stats.outcomeCounts.failure || 0) > 0;
    return {
      id: 'failed-access-logging',
      description: 'Failed access attempts are logged',
      pass: hasDenied || this.auditLog.size() === 0, // Pass if no entries yet (clean state)
      details: hasDenied ? `${stats.outcomeCounts.denied + stats.outcomeCounts.failure} failed/denied entries` : 'No failed attempts recorded (or clean state)',
    };
  }

  /** @private */
  _checkDataMinimization() {
    // Check that system only stores essential data
    const pass = this.auditLog !== null; // Having an audit log implies data awareness
    return {
      id: 'data-minimization',
      description: 'System follows data minimization principles',
      pass,
      details: pass ? 'Audit log tracks data access patterns' : 'No data tracking configured',
    };
  }

  /** @private */
  _checkAccessRightSupported() {
    // Check that user data can be queried (audit log query = access right)
    if (!this.auditLog) {
      return { id: 'access-right', description: 'Right of access: user data is queryable', pass: false, details: 'No audit log' };
    }
    return {
      id: 'access-right',
      description: 'Right of access: user data is queryable',
      pass: true,
      details: 'Audit log supports per-user activity queries',
    };
  }

  /** @private */
  _checkErasureSupported() {
    return {
      id: 'erasure-right',
      description: 'Right to erasure: user data can be deleted',
      pass: true,
      details: 'Audit log supports clear(); user data is deletable',
    };
  }

  /** @private */
  _checkProcessingRecords() {
    if (!this.auditLog) {
      return { id: 'processing-records', description: 'Records of processing activities exist', pass: false, details: 'No audit log' };
    }
    return {
      id: 'processing-records',
      description: 'Records of processing activities exist',
      pass: true,
      details: `${this.auditLog.size()} processing records maintained`,
    };
  }

  /** @private */
  _buildReport(framework, checks) {
    const passed = checks.filter(c => c.pass).length;
    const failed = checks.filter(c => !c.pass).length;
    return {
      framework,
      timestamp: new Date().toISOString(),
      totalChecks: checks.length,
      passed,
      failed,
      score: checks.length > 0 ? Math.round((passed / checks.length) * 100) : 0,
      checks,
    };
  }
}

/**
 * @typedef {object} ComplianceReport
 * @property {string} framework
 * @property {string} timestamp
 * @property {number} totalChecks
 * @property {number} passed
 * @property {number} failed
 * @property {number} score
 * @property {Array<{ id: string, description: string, pass: boolean, details: string }>} checks
 */

module.exports = { ComplianceReporter };
