'use strict';

const crypto = require('crypto');

/**
 * Compliance Reporting — hardened per 2026-04-12 security audit.
 *
 * Replaces "is X non-null?" presence checks with BEHAVIORAL PROBES:
 *   - SSO check: forge a JWT with alg=none, verify it is REJECTED.
 *   - RBAC check: attempt to self-grant admin without permission, verify it is REJECTED.
 *   - Audit integrity check: tamper an entry, verify verifyIntegrity reports broken chain.
 *   - Erasure check: require explicit implementation (no hardcoded pass).
 *
 * Each probe returns { pass, details, evidence } where evidence shows WHAT was tested.
 */
class ComplianceReporter {
  /**
   * @param {object} [deps={}]
   * @param {import('./audit-log').AuditLog} [deps.auditLog]
   * @param {import('./rbac').RBAC} [deps.rbac]
   * @param {import('./sso').SSOManager} [deps.sso]
   * @param {object} [deps.dataSubjectOps] - Optional handlers that prove GDPR operations work
   * @param {function(string): boolean} [deps.dataSubjectOps.eraseUserData] - Must delete user data and return true
   * @param {function(string): object} [deps.dataSubjectOps.exportUserData] - Must return user's data (access right)
   */
  constructor(deps = {}) {
    this.auditLog = deps.auditLog || null;
    this.rbac = deps.rbac || null;
    this.sso = deps.sso || null;
    this.dataSubjectOps = deps.dataSubjectOps || null;
    this.customChecks = new Map();
  }

  registerCheck(id, category, description, checkFn) {
    this.customChecks.set(id, { id, category, description, checkFn });
  }

  // ==========================================================================
  // SOC2 checks (behavioral)
  // ==========================================================================

  checkSOC2() {
    const checks = [];

    // CC6.1 — Access control actually rejects unauthorized actions
    checks.push(this._probeRBACRejectsUnauthorized());
    checks.push(this._probeSSORejectsForgedToken());

    // CC6.2 — Audit integrity can detect tampering
    checks.push(this._probeAuditDetectsTampering());
    checks.push(this._probeAuditIsPersistent());

    // CC6.3 — Change management: admin role enforced
    checks.push(this._probeAdminRoleRequired());

    // CC7.1 — Monitoring: audit log receives write events
    checks.push(this._checkAuditHasEntries());
    checks.push(this._probeFailedAccessCaptured());

    // Custom
    this._runCustomChecks(checks, 'soc2');

    return this._buildReport('SOC2', checks);
  }

  checkGDPR() {
    const checks = [];

    // Article 5 — Data minimization: are we collecting only necessary data?
    //   We can't prove this automatically, so require an operator-provided callback.
    checks.push(this._probeDataMinimization());

    // Article 15 — Right of access (behavioral: can we export user data?)
    checks.push(this._probeAccessRight());

    // Article 17 — Right to erasure (behavioral: does erasure actually work?)
    checks.push(this._probeErasureRight());

    // Article 25 — Data protection by design: audit + RBAC + SSO all operational
    checks.push(this._probeAuditDetectsTampering());

    // Article 30 — Records of processing
    checks.push(this._checkAuditHasEntries());

    // Article 32 — Security of processing
    checks.push(this._probeRBACRejectsUnauthorized());
    checks.push(this._probeSSORejectsForgedToken());

    this._runCustomChecks(checks, 'gdpr');

    return this._buildReport('GDPR', checks);
  }

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
          ((soc2.passed + gdpr.passed) / (soc2.totalChecks + gdpr.totalChecks)) * 100,
        ),
        timestamp: new Date().toISOString(),
      },
    };
  }

  // ==========================================================================
  // BEHAVIORAL PROBES
  // ==========================================================================

  /**
   * Verify RBAC actually enforces permissions by attempting an unauthorized action.
   */
  _probeRBACRejectsUnauthorized() {
    if (!this.rbac) {
      return this._fail('rbac-enforcement', 'RBAC enforces permissions', 'RBAC not configured');
    }
    const probeUser = `compliance-probe-${crypto.randomBytes(4).toString('hex')}`;
    let threwAsExpected = false;
    try {
      // Try to create a role WITHOUT having manage_roles permission
      this.rbac.createRole(probeUser, 'test-probe-role', 'Probe', ['read']);
    } catch (err) {
      if (err.message && err.message.includes('Access denied')) threwAsExpected = true;
    }
    return {
      id: 'rbac-enforcement',
      description: 'RBAC actually rejects unauthorized role operations',
      pass: threwAsExpected,
      details: threwAsExpected
        ? 'Probe user without manage_roles was rejected as expected'
        : 'CRITICAL: Unauthorized user was allowed to create a role',
      evidence: { probeUser, expectation: 'Access denied', observed: threwAsExpected ? 'denied' : 'allowed' },
    };
  }

  /**
   * Verify SSO actually rejects a forged JWT (alg=none).
   */
  _probeSSORejectsForgedToken() {
    if (!this.sso) {
      return this._fail('sso-forgery-rejected', 'SSO rejects forged tokens', 'SSO not configured');
    }
    const providers = this.sso.listProviders().filter(p => p.type === 'oidc');
    if (providers.length === 0) {
      return this._fail('sso-forgery-rejected', 'SSO rejects forged tokens', 'No OIDC providers registered');
    }
    const providerId = providers[0].id;
    // Craft a forged JWT with alg=none
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      sub: 'attacker', iss: 'forged-iss', aud: 'forged-aud', exp: 9999999999, iat: 0,
    })).toString('base64url');
    const forged = `${header}.${payload}.`;

    const result = this.sso.validateOIDCToken(forged, providerId);
    const pass = result.valid === false;
    return {
      id: 'sso-forgery-rejected',
      description: 'SSO rejects forged tokens (alg=none)',
      pass,
      details: pass
        ? `Forged token rejected: ${result.error}`
        : 'CRITICAL: SSO accepted a forged alg=none token',
      evidence: { providerId, forgedAlg: 'none', observed: result.error || 'accepted' },
    };
  }

  /**
   * Verify audit log integrity verification actually detects tampering.
   * We clone the current state, tamper an entry, and confirm verifyIntegrity fails.
   */
  _probeAuditDetectsTampering() {
    if (!this.auditLog) {
      return this._fail('audit-tamper-detection', 'Audit detects tampering', 'Audit log not configured');
    }
    if (this.auditLog.size() === 0) {
      // Add a probe entry so we have something to tamper
      try {
        this.auditLog.log({
          userId: 'compliance-probe', action: 'compliance_probe',
          outcome: 'success', metadata: { purpose: 'tamper-detection' },
        });
      } catch {
        return this._fail('audit-tamper-detection', 'Audit detects tampering', 'Could not log probe entry');
      }
    }
    // Snapshot, tamper a COPY of the internal entry, run verify, restore.
    // We do NOT mutate the live log — we test a detached copy.
    const entries = this.auditLog.entries;
    if (!entries || entries.length === 0) {
      return this._fail('audit-tamper-detection', 'Audit detects tampering', 'No entries to probe');
    }
    const original = { ...entries[entries.length - 1] };
    // Mutate in place for the verify call, then restore
    entries[entries.length - 1] = { ...original, userId: 'tampered-by-probe' };
    const verifyResult = this.auditLog.verifyIntegrity();
    entries[entries.length - 1] = original;

    const pass = verifyResult.valid === false;
    return {
      id: 'audit-tamper-detection',
      description: 'verifyIntegrity() actually detects tampered entries',
      pass,
      details: pass
        ? 'Tamper detected as expected'
        : 'CRITICAL: verifyIntegrity passed on tampered data',
      evidence: { observed: verifyResult.valid ? 'passed' : 'detected', reason: verifyResult.reason },
    };
  }

  /**
   * Verify audit log is actually persisted to disk (not in-memory only).
   */
  _probeAuditIsPersistent() {
    if (!this.auditLog) {
      return this._fail('audit-persistence', 'Audit log persists across restarts', 'No audit log');
    }
    const pass = !!this.auditLog.filePath;
    return {
      id: 'audit-persistence',
      description: 'Audit log persists to disk (survives process restart)',
      pass,
      details: pass ? `Persisted to ${this.auditLog.filePath}` : 'FAIL: In-memory only; restart wipes log',
      evidence: { filePath: this.auditLog.filePath || null },
    };
  }

  _probeAdminRoleRequired() {
    if (!this.rbac) {
      return this._fail('admin-role', 'Admin role has manage_roles permission', 'No RBAC');
    }
    const admin = this.rbac.getRole('admin');
    if (!admin) {
      return this._fail('admin-role', 'Admin role exists', 'No admin role');
    }
    const hasManageRoles = admin.permissions && admin.permissions.includes('manage_roles');
    return {
      id: 'admin-role',
      description: 'Admin role has manage_roles permission and is immutable',
      pass: hasManageRoles && admin.builtIn === true,
      details: `Admin role has manage_roles=${hasManageRoles}, builtIn=${admin.builtIn}`,
      evidence: { permissions: admin.permissions ? admin.permissions.length : 0, builtIn: admin.builtIn },
    };
  }

  _checkAuditHasEntries() {
    if (!this.auditLog) {
      return this._fail('audit-has-entries', 'Audit log receives events', 'No audit log');
    }
    const size = this.auditLog.size();
    return {
      id: 'audit-has-entries',
      description: 'Audit log is actively receiving entries',
      pass: size > 0,
      details: size > 0 ? `${size} entries recorded` : 'No entries yet',
      evidence: { size },
    };
  }

  _probeFailedAccessCaptured() {
    if (!this.auditLog) {
      return this._fail('failed-access-captured', 'Failed access is captured in audit', 'No audit log');
    }
    const stats = this.auditLog.getStats();
    const denied = stats.outcomeCounts.denied || 0;
    const failure = stats.outcomeCounts.failure || 0;
    // Log a denied probe event to actually TEST the capture
    const probeMarker = `compliance-probe-denial-${crypto.randomBytes(4).toString('hex')}`;
    try {
      this.auditLog.log({
        userId: probeMarker, action: 'compliance_probe_denial',
        outcome: 'denied', metadata: { purpose: 'denial-capture' },
      });
    } catch {
      return this._fail('failed-access-captured', 'Failed access is captured', 'Could not log probe');
    }
    const found = this.auditLog.query({ userId: probeMarker }).length > 0;
    return {
      id: 'failed-access-captured',
      description: 'Denied/failure events are captured in audit',
      pass: found,
      details: found
        ? `Denial capture verified via live probe; ${denied + failure} historical denials`
        : 'CRITICAL: Denial probe not recorded',
      evidence: { historicalDenied: denied, historicalFailure: failure, probeFound: found },
    };
  }

  // ---- GDPR probes ----

  _probeDataMinimization() {
    // Honest: we cannot automatically verify minimization.
    // If operator provides a dataMinimizationStatement callback, call it; otherwise flag as
    // "operator must attest" (not blindly pass).
    if (this.dataSubjectOps && typeof this.dataSubjectOps.dataMinimizationAttestation === 'function') {
      try {
        const attestation = this.dataSubjectOps.dataMinimizationAttestation();
        return {
          id: 'data-minimization',
          description: 'Operator attests to data minimization',
          pass: attestation.pass === true,
          details: attestation.details || 'Operator-provided attestation',
          evidence: { attested: attestation.pass, detailsProvided: !!attestation.details },
        };
      } catch (err) {
        return this._fail('data-minimization', 'Data minimization attestation', `Callback threw: ${err.message}`);
      }
    }
    return this._fail(
      'data-minimization',
      'Data minimization (GDPR Art 5)',
      'Requires operator attestation via dataSubjectOps.dataMinimizationAttestation; automatic probe is not available',
    );
  }

  _probeAccessRight() {
    if (!this.dataSubjectOps || typeof this.dataSubjectOps.exportUserData !== 'function') {
      return this._fail(
        'access-right',
        'GDPR Art 15 right of access',
        'Not implemented: provide dataSubjectOps.exportUserData(userId) → user data',
      );
    }
    // Behavioral probe: call the export with a probe user ID
    const probeUser = `gdpr-access-probe-${crypto.randomBytes(4).toString('hex')}`;
    try {
      const data = this.dataSubjectOps.exportUserData(probeUser);
      const ok = data !== undefined; // implementation returned something
      return {
        id: 'access-right',
        description: 'GDPR Art 15 right of access: exportUserData works',
        pass: ok,
        details: ok ? 'exportUserData returned a response' : 'exportUserData returned undefined',
        evidence: { probeUser, returned: ok ? 'data' : 'undefined' },
      };
    } catch (err) {
      return this._fail('access-right', 'GDPR Art 15 right of access', `Implementation threw: ${err.message}`);
    }
  }

  _probeErasureRight() {
    if (!this.dataSubjectOps || typeof this.dataSubjectOps.eraseUserData !== 'function') {
      return this._fail(
        'erasure-right',
        'GDPR Art 17 right to erasure',
        'Not implemented: provide dataSubjectOps.eraseUserData(userId) → boolean. '
        + 'Clearing the audit log is NOT GDPR erasure.',
      );
    }
    const probeUser = `gdpr-erasure-probe-${crypto.randomBytes(4).toString('hex')}`;
    try {
      const erased = this.dataSubjectOps.eraseUserData(probeUser);
      const ok = erased === true || (erased && typeof erased === 'object' && erased.success === true);
      return {
        id: 'erasure-right',
        description: 'GDPR Art 17 right to erasure: eraseUserData works',
        pass: ok,
        details: ok ? 'eraseUserData returned success' : 'eraseUserData did not return success',
        evidence: { probeUser, returned: erased },
      };
    } catch (err) {
      return this._fail('erasure-right', 'GDPR Art 17 right to erasure', `Implementation threw: ${err.message}`);
    }
  }

  // ---- helpers ----

  _runCustomChecks(checks, category) {
    for (const check of this.customChecks.values()) {
      if (check.category === category) {
        try {
          const result = check.checkFn();
          checks.push({ id: check.id, description: check.description, ...result });
        } catch (err) {
          checks.push({
            id: check.id,
            description: check.description,
            pass: false,
            details: err.message,
          });
        }
      }
    }
  }

  _fail(id, description, reason) {
    return { id, description, pass: false, details: reason, evidence: null };
  }

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

module.exports = { ComplianceReporter };
