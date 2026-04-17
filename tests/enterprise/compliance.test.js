'use strict';

const crypto = require('crypto');
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

describe('ComplianceReporter', () => {
  let reporter;
  let auditLog;
  let rbac;
  let sso;

  beforeEach(() => {
    auditLog = new AuditLog({ secret: 'test-secret-at-least-32-bytes-long-for-hmac' });
    rbac = new RBAC();
    sso = new SSOManager();
    sso.registerProvider({
      id: 'okta', type: 'oidc', name: 'Okta',
      issuer: 'https://okta.example.com', clientId: 'test-client',
      publicKey: testPubKey, algorithms: ['RS256'],
    });

    reporter = new ComplianceReporter({ auditLog, rbac, sso });
  });

  describe('SOC2', () => {
    test('runs all SOC2 checks', () => {
      const report = reporter.checkSOC2();
      expect(report.framework).toBe('SOC2');
      expect(report.totalChecks).toBeGreaterThan(0);
      expect(report.score).toBeGreaterThanOrEqual(0);
      expect(report.checks).toBeInstanceOf(Array);
    });

    test('passes when all systems configured', () => {
      // Add some audit entries to satisfy write-tracking check
      auditLog.log({ userId: 'u', action: 'create_plan', outcome: 'success' });
      auditLog.log({ userId: 'u', action: 'login', outcome: 'denied' });

      const report = reporter.checkSOC2();
      expect(report.passed).toBeGreaterThan(0);
      // With full setup, most checks should pass
      expect(report.score).toBeGreaterThanOrEqual(50);
    });

    test('reports failures without systems', () => {
      const bare = new ComplianceReporter();
      const report = bare.checkSOC2();
      expect(report.failed).toBeGreaterThan(0);
    });

    test('checks have id and description', () => {
      const report = reporter.checkSOC2();
      for (const check of report.checks) {
        expect(check.id).toBeDefined();
        expect(check.description).toBeDefined();
        expect(typeof check.pass).toBe('boolean');
        expect(check.details).toBeDefined();
      }
    });
  });

  describe('GDPR', () => {
    test('runs all GDPR checks', () => {
      const report = reporter.checkGDPR();
      expect(report.framework).toBe('GDPR');
      expect(report.totalChecks).toBeGreaterThan(0);
    });

    test('passes data subject rights checks', () => {
      const report = reporter.checkGDPR();
      const accessRight = report.checks.find(c => c.id === 'access-right');
      const erasureRight = report.checks.find(c => c.id === 'erasure-right');
      expect(accessRight.pass).toBe(true);
      expect(erasureRight.pass).toBe(true);
    });

    test('checks RBAC and SSO for security', () => {
      const report = reporter.checkGDPR();
      const rbacCheck = report.checks.find(c => c.id === 'rbac-enabled');
      const ssoCheck = report.checks.find(c => c.id === 'sso-enabled');
      expect(rbacCheck.pass).toBe(true);
      expect(ssoCheck.pass).toBe(true);
    });
  });

  describe('full audit', () => {
    test('runFullAudit returns both reports and summary', () => {
      auditLog.log({ userId: 'u', action: 'create_plan', outcome: 'denied' });
      const result = reporter.runFullAudit();
      expect(result.soc2).toBeDefined();
      expect(result.gdpr).toBeDefined();
      expect(result.summary.totalChecks).toBe(result.soc2.totalChecks + result.gdpr.totalChecks);
      expect(result.summary.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.summary.overallScore).toBeLessThanOrEqual(100);
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
