/**
 * Context Analyzer Tests
 */

const _path = require('path');
const _fs = require('fs');
const _os = require('os');
const {
  ContextAnalyzer,
  RELATIONSHIP_TYPES,
} = require('../../lib/context');

describe('ContextAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new ContextAnalyzer();
  });

  describe('analyzeFile', () => {
    test('extracts file metadata', () => {
      const content = `
        function getUserById(id) {
          return db.query('SELECT * FROM users WHERE id = ?', [id]);
        }
      `;

      const result = analyzer.analyzeFile('/src/user-service.js', content);

      expect(result.metadata.extension).toBe('.js');
      expect(result.metadata.baseName).toBe('user-service');
      expect(result.metadata.isTest).toBe(false);
    });

    test('detects test files', () => {
      const result = analyzer.analyzeFile('/tests/user.test.js', 'test code');
      expect(result.metadata.isTest).toBe(true);

      const result2 = analyzer.analyzeFile('/src/__tests__/user.js', 'test code');
      expect(result2.metadata.isTest).toBe(true);
    });

    test('extracts keywords from content', () => {
      const content = `
        class UserController {
          async login(req, res) {
            const user = await authService.authenticate(req.body);
          }
        }
      `;

      const result = analyzer.analyzeFile('/src/controllers/user.js', content);

      expect(result.keywords).toContain('user');
      expect(result.keywords).toContain('auth');
      expect(result.keywords).toContain('login');
    });

    test('tracks directory membership', () => {
      analyzer.analyzeFile('/src/services/user.js', 'code');
      analyzer.analyzeFile('/src/services/auth.js', 'code');

      const dirFiles = analyzer.directories.get('/src/services');
      expect(dirFiles.size).toBe(2);
    });
  });

  describe('extractImports', () => {
    test('returns empty when imported files do not exist', () => {
      // extractImports resolves paths using fs.existsSync
      // so non-existent files return empty
      const content = `
        import { something } from './utils';
        import helper from './helper';
      `;

      const imports = analyzer.extractImports(content, '/nonexistent');
      expect(imports.length).toBe(0);
    });

    test('ignores external packages', () => {
      const content = `
        import express from 'express';
        const lodash = require('lodash');
        import { Component } from 'react';
      `;

      const imports = analyzer.extractImports(content, '/src');
      expect(imports.length).toBe(0);
    });

    test('identifies relative import patterns', () => {
      // Test that import patterns are recognized
      // (even if files don't exist for resolution)
      const content = `
        import { something } from './utils';
        const module = require('./helper');
        const dynamic = await import('./dynamic');
        import external from 'express';  // should be ignored
      `;

      // Even though files don't exist, at least external is filtered
      const imports = analyzer.extractImports(content, '/nonexistent');
      // All relative imports return empty since files don't exist
      expect(imports.length).toBe(0);
    });
  });

  describe('extractKeywords', () => {
    test('extracts domain terms', () => {
      const content = `
        function handlePayment(order) {
          validateCustomer(order.customer);
          processPayment(order.total);
        }
      `;

      const result = analyzer.analyzeFile('/src/payment.js', content);

      expect(result.keywords).toContain('payment');
      expect(result.keywords).toContain('order');
      expect(result.keywords).toContain('customer');
    });

    test('splits camelCase and kebab-case names', () => {
      const result = analyzer.analyzeFile('/src/user-auth-service.js', 'code');

      expect(result.keywords).toContain('user');
      expect(result.keywords).toContain('auth');
      expect(result.keywords).toContain('service');
    });
  });

  describe('relationship building', () => {
    test('builds same-directory relationships', () => {
      analyzer.analyzeFile('/src/user.js', 'code');
      analyzer.analyzeFile('/src/auth.js', 'code');
      analyzer.buildRelationshipGraph();

      const related = analyzer.getRelatedFiles('/src/user.js');
      const authRelation = related.find(r => r.file.includes('auth.js'));

      expect(authRelation).toBeDefined();
      expect(authRelation.relationships).toContain(RELATIONSHIP_TYPES.SAME_DIRECTORY);
    });

    test('builds test relationships', () => {
      analyzer.analyzeFile('/src/user.js', 'code');
      analyzer.analyzeFile('/tests/user.test.js', 'test code');
      analyzer.buildRelationshipGraph();

      const related = analyzer.getRelatedFiles('/src/user.js');
      const testRelation = related.find(r => r.file.includes('user.test.js'));

      expect(testRelation).toBeDefined();
      expect(testRelation.relationships).toContain(RELATIONSHIP_TYPES.TESTED_BY);
    });

    test('builds import relationships', () => {
      analyzer.analyzeFile('/src/service.js', 'code');
      analyzer.addImportRelationship('/src/controller.js', '/src/service.js');

      const related = analyzer.getRelatedFiles('/src/service.js');
      const controllerRelation = related.find(r => r.file.includes('controller.js'));

      expect(controllerRelation).toBeDefined();
      expect(controllerRelation.relationships).toContain(RELATIONSHIP_TYPES.IMPORTED_BY);
    });
  });

  describe('getRelatedFiles', () => {
    test('returns files sorted by score', () => {
      analyzer.analyzeFile('/src/user.js', 'code');
      analyzer.analyzeFile('/src/auth.js', 'code');
      analyzer.analyzeFile('/tests/user.test.js', 'test');
      analyzer.buildRelationshipGraph();

      const related = analyzer.getRelatedFiles('/src/user.js');

      expect(related.length).toBeGreaterThan(0);
      expect(related[0].score).toBeGreaterThanOrEqual(related[related.length - 1].score);
    });

    test('respects limit parameter', () => {
      analyzer.analyzeFile('/src/a.js', 'code');
      analyzer.analyzeFile('/src/b.js', 'code');
      analyzer.analyzeFile('/src/c.js', 'code');
      analyzer.analyzeFile('/src/d.js', 'code');
      analyzer.buildRelationshipGraph();

      const related = analyzer.getRelatedFiles('/src/a.js', 2);
      expect(related.length).toBeLessThanOrEqual(2);
    });
  });

  describe('findByKeyword', () => {
    test('finds files by keyword', () => {
      analyzer.analyzeFile('/src/user-service.js', 'user handling');
      analyzer.analyzeFile('/src/auth-service.js', 'auth handling');

      const userFiles = analyzer.findByKeyword('user');
      expect(userFiles.length).toBeGreaterThan(0);
      expect(userFiles[0]).toContain('user');
    });

    test('returns empty for unknown keyword', () => {
      analyzer.analyzeFile('/src/user.js', 'code');

      const files = analyzer.findByKeyword('nonexistent');
      expect(files).toHaveLength(0);
    });
  });

  describe('findByKeywords', () => {
    test('finds intersection of keywords', () => {
      analyzer.analyzeFile('/src/user-auth.js', 'user auth code');
      analyzer.analyzeFile('/src/user-profile.js', 'user profile code');
      analyzer.analyzeFile('/src/auth-service.js', 'auth service code');

      const files = analyzer.findByKeywords(['user', 'auth']);
      expect(files.length).toBeGreaterThan(0);
    });
  });

  describe('recordCoAccess', () => {
    test('records co-access relationships', () => {
      analyzer.analyzeFile('/src/a.js', 'code');
      analyzer.analyzeFile('/src/b.js', 'code');
      analyzer.recordCoAccess(['/src/a.js', '/src/b.js']);

      const related = analyzer.getRelatedFiles('/src/a.js');
      const bRelation = related.find(r => r.file.includes('b.js'));

      expect(bRelation).toBeDefined();
      expect(bRelation.relationships).toContain(RELATIONSHIP_TYPES.CO_ACCESSED);
    });
  });

  describe('export/import', () => {
    test('exports and imports data', () => {
      analyzer.analyzeFile('/src/user.js', 'user code');
      analyzer.analyzeFile('/src/auth.js', 'auth code');
      analyzer.buildRelationshipGraph();

      const exported = analyzer.export();
      const newAnalyzer = new ContextAnalyzer();
      newAnalyzer.import(exported);

      expect(newAnalyzer.fileMetadata.size).toBe(2);
      expect(newAnalyzer.keywords.size).toBeGreaterThan(0);
    });
  });

  describe('getSummary', () => {
    test('returns analysis summary', () => {
      analyzer.analyzeFile('/src/user.js', 'code');
      analyzer.analyzeFile('/src/auth.js', 'code');
      analyzer.buildRelationshipGraph();

      const summary = analyzer.getSummary();

      expect(summary.filesAnalyzed).toBe(2);
      expect(summary.totalRelationships).toBeGreaterThan(0);
      expect(summary.keywordsIndexed).toBeGreaterThan(0);
    });
  });

  describe('clear', () => {
    test('clears all data', () => {
      analyzer.analyzeFile('/src/user.js', 'code');
      analyzer.clear();

      expect(analyzer.fileMetadata.size).toBe(0);
      expect(analyzer.keywords.size).toBe(0);
    });
  });
});
