'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { ComplianceReporter } = require('../../lib/enterprise/compliance');
const { AuditLog } = require('../../lib/enterprise/audit-log');
const { RBAC } = require('../../lib/enterprise/rbac');
const { SSOManager } = require('../../lib/enterprise/sso');

// Fixture RSA key for OIDC provider in tests
const { publicKey: testPubKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const SECRET = 'test-secret-at-least-32-bytes-long-for-hmac';

describe('ComplianceReporter (behavioral probes)', () => {
  let reporter;
  let auditLog;
  let rbac;
  let sso;
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'comp-'));
    auditLog = new AuditLog({
      secret: SECRET,
      filePath: path.join(tmpDir, 'audit.jsonl'),
    });
    rbac = new RBAC();
    sso = new SSOManager();
    sso.registerProvider({
      id: 'okta', type: 'oidc', name: 'Okta',
      issuer: 'https://okta.example.com', clientId: 'test-client',
      publicKey: testPubKey, algorithms: ['RS256'],
    });

    // Provide minimal GDPR operation handlers (implementations of the rights)
    const dataSubjectOps = {
      exportUserData: (userId) => ({ userId, data: {} }),
      eraseUserData: (userId) => ({ success: true, userId, deletedRecords: 0 }),
      dataMinimizationAttestation: () => ({ pass: true, details: 'Only audit metadata stored' }),
    };

    reporter = new ComplianceReporter({ auditLog, rbac, sso, dataSubjectOps });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('SOC2 behavioral probes', () => {
    test('rbac-enforcement: verifies unauthorized is rejected', () => {
      const report = reporter.checkSOC2();
      const probe = report.checks.find(c => c.id === 'rbac-enforcement');
      expect(probe.pass).toBe(true);
      expect(probe.evidence.observed).toBe('denied');
    });

    test('sso-forgery-rejected: verifies alg=none forgery is rejected', () => {
      const report = reporter.checkSOC2();
      const probe = report.checks.find(c => c.id === 'sso-forgery-rejected');
      expect(probe.pass).toBe(true);
    });

    test('audit-tamper-detection: verifies verifyIntegrity catches tampering', () => {
      const report = reporter.checkSOC2();
      const probe = report.checks.find(c => c.id === 'audit-tamper-detection');
      expect(probe.pass).toBe(true);
      expect(probe.evidence.observed).toBe('detected');
    });

    test('audit-persistence: detects file-backed log', () => {
      const report = reporter.checkSOC2();
      const probe = report.checks.find(c => c.id === 'audit-persistence');
      expect(probe.pass).toBe(true);
    });

    test('audit-persistence: FAILS on in-memory-only log', () => {
      const memAudit = new AuditLog({ secret: SECRET }); // no filePath
      const r = new ComplianceReporter({ auditLog: memAudit, rbac, sso });
      const report = r.checkSOC2();
      const probe = report.checks.find(c => c.id === 'audit-persistence');
      expect(probe.pass).toBe(false);
    });

    test('failed-access-captured: live probe actually logs + finds a denial', () => {
      const report = reporter.checkSOC2();
      const probe = report.checks.find(c => c.id === 'failed-access-captured');
      expect(probe.pass).toBe(true);
      expect(probe.evidence.probeFound).toBe(true);
    });
  });

  describe('SOC2 report structure', () => {
    test('runs all SOC2 checks', () => {
      const report = reporter.checkSOC2();
      expect(report.framework).toBe('SOC2');
      expect(report.totalChecks).toBeGreaterThan(0);
    });

    test('with full setup, most checks pass', () => {
      auditLog.log({ userId: 'u', action: 'create_plan', outcome: 'success' });
      auditLog.log({ userId: 'u', action: 'login', outcome: 'denied' });
      const report = reporter.checkSOC2();
      expect(report.score).toBeGreaterThanOrEqual(70);
    });

    test('bare reporter (no systems) fails most checks', () => {
      const bare = new ComplianceReporter();
      const report = bare.checkSOC2();
      expect(report.failed).toBeGreaterThan(0);
      expect(report.score).toBeLessThan(100);
    });

    test('all checks have pass/details/evidence', () => {
      const report = reporter.checkSOC2();
      for (const check of report.checks) {
        expect(check.id).toBeDefined();
        expect(typeof check.pass).toBe('boolean');
        expect(check.details).toBeDefined();
      }
    });
  });

  describe('GDPR behavioral probes', () => {
    test('access-right: passes when exportUserData is provided', () => {
      const report = reporter.checkGDPR();
      const probe = report.checks.find(c => c.id === 'access-right');
      expect(probe.pass).toBe(true);
    });

    test('access-right: FAILS when exportUserData is not provided', () => {
      const r = new ComplianceReporter({ auditLog, rbac, sso }); // no dataSubjectOps
      const report = r.checkGDPR();
      const probe = report.checks.find(c => c.id === 'access-right');
      expect(probe.pass).toBe(false);
      expect(probe.details).toContain('Not implemented');
    });

    test('erasure-right: passes when eraseUserData returns success', () => {
      const report = reporter.checkGDPR();
      const probe = report.checks.find(c => c.id === 'erasure-right');
      expect(probe.pass).toBe(true);
    });

    test('erasure-right: FAILS when eraseUserData is not provided', () => {
      const r = new ComplianceReporter({ auditLog, rbac, sso });
      const report = r.checkGDPR();
      const probe = report.checks.find(c => c.id === 'erasure-right');
      expect(probe.pass).toBe(false);
    });

    test('erasure-right: FAILS when eraseUserData returns non-success', () => {
      const badOps = {
        exportUserData: () => ({}),
        eraseUserData: () => false, // pretends to erase but returns false
        dataMinimizationAttestation: () => ({ pass: true }),
      };
      const r = new ComplianceReporter({ auditLog, rbac, sso, dataSubjectOps: badOps });
      const report = r.checkGDPR();
      const probe = report.checks.find(c => c.id === 'erasure-right');
      expect(probe.pass).toBe(false);
    });

    test('data-minimization: FAILS without attestation', () => {
      const r = new ComplianceReporter({ auditLog, rbac, sso });
      const report = r.checkGDPR();
      const probe = report.checks.find(c => c.id === 'data-minimization');
      expect(probe.pass).toBe(false);
    });

    test('data-minimization: passes with attestation', () => {
      const report = reporter.checkGDPR();
      const probe = report.checks.find(c => c.id === 'data-minimization');
      expect(probe.pass).toBe(true);
    });
  });

  describe('full audit', () => {
    test('runFullAudit returns both reports and summary', () => {
      const result = reporter.runFullAudit();
      expect(result.soc2).toBeDefined();
      expect(result.gdpr).toBeDefined();
      expect(result.summary.totalChecks).toBe(result.soc2.totalChecks + result.gdpr.totalChecks);
    });
  });

  describe('custom checks', () => {
    test('registerCheck adds a custom SOC2 check', () => {
      reporter.registerCheck('custom-encryption', 'soc2', 'Data is encrypted at rest', () => ({
        pass: true, details: 'AES-256 encryption enabled',
      }));
      const report = reporter.checkSOC2();
      const custom = report.checks.find(c => c.id === 'custom-encryption');
      expect(custom).toBeDefined();
      expect(custom.pass).toBe(true);
    });

    test('registerCheck adds a custom GDPR check', () => {
      reporter.registerCheck('dpia', 'gdpr', 'DPIA completed', () => ({
        pass: false, details: 'DPIA not yet done',
      }));
      const report = reporter.checkGDPR();
      const custom = report.checks.find(c => c.id === 'dpia');
      expect(custom).toBeDefined();
      expect(custom.pass).toBe(false);
    });

    test('custom check that throws is caught', () => {
      reporter.registerCheck('broken', 'soc2', 'Broken check', () => {
        throw new Error('Check failed');
      });
      const report = reporter.checkSOC2();
      const broken = report.checks.find(c => c.id === 'broken');
      expect(broken.pass).toBe(false);
      expect(broken.details).toContain('Check failed');
    });
  });
});
