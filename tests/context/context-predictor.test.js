/**
 * Context Predictor Tests
 */

const {
  ContextPredictor,
  AccessPattern,
  CONFIDENCE,
  CONTEXT_TYPES,
} = require('../../lib/context');

describe('ContextPredictor', () => {
  let predictor;

  beforeEach(() => {
    predictor = new ContextPredictor();
  });

  describe('constructor', () => {
    test('initializes with analyzer and access pattern', () => {
      expect(predictor.analyzer).toBeDefined();
      expect(predictor.accessPattern).toBeDefined();
      expect(predictor.featureFileMap).toBeInstanceOf(Map);
      expect(predictor.taskHistory).toEqual([]);
    });
  });

  describe('getAnalyzer', () => {
    test('returns the context analyzer', () => {
      const analyzer = predictor.getAnalyzer();
      expect(analyzer).toBe(predictor.analyzer);
    });
  });

  describe('recordAccess', () => {
    test('delegates to access pattern', () => {
      predictor.recordAccess('/src/file.js', 'read');
      expect(predictor.accessPattern.accesses.length).toBe(1);
      expect(predictor.accessPattern.accesses[0].file).toBe('/src/file.js');
    });
  });

  describe('recordTask', () => {
    test('records task with files', () => {
      predictor.recordTask('fix authentication bug', ['/src/auth.js', '/src/login.js']);

      expect(predictor.taskHistory.length).toBe(1);
      expect(predictor.taskHistory[0].task).toBe('fix authentication bug');
      expect(predictor.taskHistory[0].files).toEqual(['/src/auth.js', '/src/login.js']);
    });

    test('maps keywords to files', () => {
      predictor.recordTask('authentication logic', ['/src/auth.js']);

      expect(predictor.featureFileMap.has('authentication')).toBe(true);
      expect(predictor.featureFileMap.get('authentication').has('/src/auth.js')).toBe(true);
    });

    test('limits task history to 100', () => {
      for (let i = 0; i < 110; i++) {
        predictor.recordTask(`task ${i}`, ['/file.js']);
      }

      expect(predictor.taskHistory.length).toBe(100);
    });
  });

  describe('extractTaskKeywords', () => {
    test('extracts meaningful words', () => {
      const keywords = predictor.extractTaskKeywords('fix authentication login bug');

      expect(keywords).toContain('authentication');
      expect(keywords).toContain('login');
      expect(keywords).toContain('bug');
    });

    test('filters stop words', () => {
      const keywords = predictor.extractTaskKeywords('add the feature and update with this');

      expect(keywords).not.toContain('the');
      expect(keywords).not.toContain('and');
      expect(keywords).not.toContain('add');
      expect(keywords).toContain('feature');
    });

    test('filters short words', () => {
      const keywords = predictor.extractTaskKeywords('fix a db connection');

      expect(keywords).not.toContain('a');
      expect(keywords).not.toContain('db');
      expect(keywords).toContain('connection');
    });
  });

  describe('predictForTask', () => {
    test('returns prediction structure', () => {
      const prediction = predictor.predictForTask('fix authentication bug');

      expect(prediction).toHaveProperty('files');
      expect(prediction).toHaveProperty('decisions');
      expect(prediction).toHaveProperty('patterns');
      expect(prediction).toHaveProperty('confidence');
      expect(prediction).toHaveProperty('reasoning');
    });

    test('predicts based on keyword matches', () => {
      predictor.analyzer.analyzeFile('/src/auth/login.js', 'authentication login code');
      predictor.analyzer.buildRelationshipGraph();

      const prediction = predictor.predictForTask('fix authentication login bug');

      expect(prediction.files.length).toBeGreaterThan(0);
      expect(prediction.files[0].path).toContain('login');
    });

    test('uses task history for predictions', () => {
      predictor.recordTask('payment processing', ['/src/payment.js']);
      predictor.analyzer.analyzeFile('/src/payment.js', 'payment code');

      const prediction = predictor.predictForTask('fix payment issue');

      expect(prediction.files.some(f => f.path.includes('payment'))).toBe(true);
    });

    test('respects maxFiles option', () => {
      for (let i = 0; i < 20; i++) {
        predictor.analyzer.analyzeFile(`/src/auth${i}.js`, 'auth code');
      }
      predictor.analyzer.buildRelationshipGraph();

      const prediction = predictor.predictForTask('auth fix', { maxFiles: 5 });

      expect(prediction.files.length).toBeLessThanOrEqual(5);
    });
  });

  describe('predictForFile', () => {
    test('returns prediction structure', () => {
      predictor.analyzer.analyzeFile('/src/user.js', 'code');
      predictor.analyzer.buildRelationshipGraph();

      const prediction = predictor.predictForFile('/src/user.js');

      expect(prediction).toHaveProperty('files');
      expect(prediction).toHaveProperty('confidence');
      expect(prediction).toHaveProperty('reasoning');
    });

    test('finds related files', () => {
      predictor.analyzer.analyzeFile('/src/user.js', 'code');
      predictor.analyzer.analyzeFile('/src/auth.js', 'code');
      predictor.analyzer.analyzeFile('/tests/user.test.js', 'test');
      predictor.analyzer.buildRelationshipGraph();

      const prediction = predictor.predictForFile('/src/user.js');

      expect(prediction.files.length).toBeGreaterThan(0);
    });

    test('considers co-access patterns', () => {
      predictor.analyzer.analyzeFile('/src/a.js', 'code');
      predictor.analyzer.analyzeFile('/src/b.js', 'code');

      predictor.recordAccess('/src/a.js');
      predictor.recordAccess('/src/b.js');
      predictor.recordAccess('/src/a.js');
      predictor.recordAccess('/src/b.js');

      predictor.analyzer.buildRelationshipGraph();

      const prediction = predictor.predictForFile('/src/a.js');
      const bFile = prediction.files.find(f => f.path.includes('b.js'));

      expect(bFile).toBeDefined();
    });
  });

  describe('predictForFeature', () => {
    test('returns prediction structure', () => {
      const prediction = predictor.predictForFeature('payment');

      expect(prediction).toHaveProperty('files');
      expect(prediction).toHaveProperty('confidence');
      expect(prediction).toHaveProperty('reasoning');
    });

    test('finds files by feature keywords', () => {
      predictor.analyzer.analyzeFile('/src/payment/checkout.js', 'payment checkout');
      predictor.analyzer.analyzeFile('/src/payment/refund.js', 'payment refund');
      predictor.analyzer.analyzeFile('/src/user/profile.js', 'user profile');
      predictor.analyzer.buildRelationshipGraph();

      const prediction = predictor.predictForFeature('payment');

      expect(prediction.files.some(f => f.path.includes('payment'))).toBe(true);
    });

    test('considers feature-file map', () => {
      predictor.recordTask('payment processing', ['/src/pay.js']);
      predictor.analyzer.analyzeFile('/src/pay.js', 'code');

      const prediction = predictor.predictForFeature('payment');

      expect(prediction.files.some(f => f.path.includes('pay'))).toBe(true);
    });
  });

  describe('getSummary', () => {
    test('returns summary statistics', () => {
      predictor.analyzer.analyzeFile('/src/file.js', 'code');
      predictor.recordAccess('/src/file.js');
      predictor.recordTask('test task', ['/src/file.js']);

      const summary = predictor.getSummary();

      expect(summary.analyzer).toBeDefined();
      expect(summary.accessPatterns).toBeDefined();
      expect(summary.accessPatterns.totalAccesses).toBe(1);
      expect(summary.tasksRecorded).toBe(1);
    });
  });

  describe('endSession', () => {
    test('ends the access pattern session', () => {
      predictor.recordAccess('/src/file.js');
      expect(predictor.accessPattern.currentSession.length).toBe(1);

      predictor.endSession();

      expect(predictor.accessPattern.currentSession.length).toBe(0);
      expect(predictor.accessPattern.sessions.length).toBe(1);
    });
  });

  describe('export/import', () => {
    test('exports and imports data correctly', () => {
      predictor.analyzer.analyzeFile('/src/user.js', 'user code');
      predictor.recordTask('user feature', ['/src/user.js']);
      predictor.recordAccess('/src/user.js');

      const exported = predictor.export();

      const newPredictor = new ContextPredictor();
      newPredictor.import(exported);

      expect(newPredictor.featureFileMap.has('user')).toBe(true);
      expect(newPredictor.taskHistory.length).toBe(1);
    });
  });

  describe('clear', () => {
    test('clears all data', () => {
      predictor.analyzer.analyzeFile('/src/file.js', 'code');
      predictor.recordAccess('/src/file.js');
      predictor.recordTask('task', ['/src/file.js']);

      predictor.clear();

      expect(predictor.analyzer.fileMetadata.size).toBe(0);
      expect(predictor.accessPattern.accesses.length).toBe(0);
      expect(predictor.featureFileMap.size).toBe(0);
      expect(predictor.taskHistory.length).toBe(0);
    });
  });
});

describe('AccessPattern', () => {
  let pattern;

  beforeEach(() => {
    pattern = new AccessPattern();
  });

  describe('constructor', () => {
    test('initializes with default values', () => {
      expect(pattern.accesses).toEqual([]);
      expect(pattern.sessions).toEqual([]);
      expect(pattern.currentSession).toEqual([]);
      expect(pattern.maxSize).toBe(1000);
      expect(pattern.coOccurrence).toBeInstanceOf(Map);
    });

    test('accepts custom maxSize', () => {
      const custom = new AccessPattern(500);
      expect(custom.maxSize).toBe(500);
    });
  });

  describe('recordAccess', () => {
    test('adds to accesses array', () => {
      pattern.recordAccess('/file.js');

      expect(pattern.accesses.length).toBe(1);
      expect(pattern.accesses[0].file).toBe('/file.js');
      expect(pattern.accesses[0].context).toBe('read');
      expect(pattern.accesses[0].timestamp).toBeDefined();
    });

    test('adds to current session', () => {
      pattern.recordAccess('/a.js');
      pattern.recordAccess('/b.js');

      expect(pattern.currentSession).toEqual(['/a.js', '/b.js']);
    });

    test('updates co-occurrence with recent files', () => {
      pattern.recordAccess('/a.js');
      pattern.recordAccess('/b.js');

      const coCount = pattern.coOccurrence.get('/a.js')?.get('/b.js');
      expect(coCount).toBe(1);
    });

    test('trims accesses when exceeding maxSize', () => {
      const smallPattern = new AccessPattern(5);

      for (let i = 0; i < 10; i++) {
        smallPattern.recordAccess(`/file${i}.js`);
      }

      expect(smallPattern.accesses.length).toBe(5);
      expect(smallPattern.accesses[0].file).toBe('/file5.js');
    });
  });

  describe('incrementCoOccurrence', () => {
    test('creates maps if not existing', () => {
      pattern.incrementCoOccurrence('/a.js', '/b.js');

      expect(pattern.coOccurrence.has('/a.js')).toBe(true);
      expect(pattern.coOccurrence.has('/b.js')).toBe(true);
    });

    test('increments both directions', () => {
      pattern.incrementCoOccurrence('/a.js', '/b.js');
      pattern.incrementCoOccurrence('/a.js', '/b.js');

      expect(pattern.coOccurrence.get('/a.js').get('/b.js')).toBe(2);
      expect(pattern.coOccurrence.get('/b.js').get('/a.js')).toBe(2);
    });
  });

  describe('endSession', () => {
    test('saves current session to sessions', () => {
      pattern.recordAccess('/a.js');
      pattern.recordAccess('/b.js');
      pattern.endSession();

      expect(pattern.sessions.length).toBe(1);
      expect(pattern.sessions[0]).toEqual(['/a.js', '/b.js']);
      expect(pattern.currentSession).toEqual([]);
    });

    test('does nothing if current session is empty', () => {
      pattern.endSession();

      expect(pattern.sessions.length).toBe(0);
    });

    test('limits sessions to 50', () => {
      for (let i = 0; i < 60; i++) {
        pattern.recordAccess(`/file${i}.js`);
        pattern.endSession();
      }

      expect(pattern.sessions.length).toBe(50);
    });
  });

  describe('getFrequentlyAccessedWith', () => {
    test('returns files accessed together', () => {
      pattern.recordAccess('/a.js');
      pattern.recordAccess('/b.js');
      pattern.recordAccess('/c.js');

      const result = pattern.getFrequentlyAccessedWith('/a.js');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('file');
      expect(result[0]).toHaveProperty('count');
    });

    test('returns empty for unknown file', () => {
      const result = pattern.getFrequentlyAccessedWith('/unknown.js');
      expect(result).toEqual([]);
    });

    test('respects limit', () => {
      for (let i = 0; i < 20; i++) {
        pattern.recordAccess(`/file${i}.js`);
      }

      const result = pattern.getFrequentlyAccessedWith('/file0.js', 5);
      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getRecentFiles', () => {
    test('returns recently accessed files', () => {
      pattern.recordAccess('/a.js');
      pattern.recordAccess('/b.js');
      pattern.recordAccess('/c.js');

      const recent = pattern.getRecentFiles(2);

      expect(recent.length).toBe(2);
      expect(recent[0]).toBe('/c.js');
      expect(recent[1]).toBe('/b.js');
    });

    test('returns unique files', () => {
      pattern.recordAccess('/a.js');
      pattern.recordAccess('/b.js');
      pattern.recordAccess('/a.js');

      const recent = pattern.getRecentFiles(10);

      expect(recent.length).toBe(2);
      expect(recent[0]).toBe('/a.js');
    });
  });

  describe('getSessionPatterns', () => {
    test('returns file pairs appearing in multiple sessions', () => {
      pattern.recordAccess('/a.js');
      pattern.recordAccess('/b.js');
      pattern.endSession();

      pattern.recordAccess('/a.js');
      pattern.recordAccess('/b.js');
      pattern.endSession();

      const patterns = pattern.getSessionPatterns();

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].files).toContain('/a.js');
      expect(patterns[0].files).toContain('/b.js');
      expect(patterns[0].frequency).toBe(2);
    });

    test('filters patterns with frequency < 2', () => {
      pattern.recordAccess('/a.js');
      pattern.recordAccess('/b.js');
      pattern.endSession();

      const patterns = pattern.getSessionPatterns();

      expect(patterns.length).toBe(0);
    });
  });

  describe('export/import', () => {
    test('exports data correctly', () => {
      pattern.recordAccess('/a.js');
      pattern.recordAccess('/b.js');
      pattern.endSession();

      const exported = pattern.export();

      expect(exported.accesses).toBeDefined();
      expect(exported.sessions).toBeDefined();
      expect(exported.coOccurrence).toBeDefined();
    });

    test('imports data correctly', () => {
      pattern.recordAccess('/a.js');
      pattern.recordAccess('/b.js');
      pattern.endSession();

      const exported = pattern.export();

      const newPattern = new AccessPattern();
      newPattern.import(exported);

      expect(newPattern.accesses.length).toBe(2);
      expect(newPattern.sessions.length).toBe(1);
    });
  });

  describe('clear', () => {
    test('clears all data', () => {
      pattern.recordAccess('/file.js');
      pattern.endSession();
      pattern.clear();

      expect(pattern.accesses.length).toBe(0);
      expect(pattern.sessions.length).toBe(0);
      expect(pattern.currentSession.length).toBe(0);
      expect(pattern.coOccurrence.size).toBe(0);
    });
  });
});

describe('CONFIDENCE', () => {
  test('has expected values', () => {
    expect(CONFIDENCE.HIGH).toBe('high');
    expect(CONFIDENCE.MEDIUM).toBe('medium');
    expect(CONFIDENCE.LOW).toBe('low');
  });
});

describe('CONTEXT_TYPES', () => {
  test('has expected values', () => {
    expect(CONTEXT_TYPES.FILE).toBe('file');
    expect(CONTEXT_TYPES.DECISION).toBe('decision');
    expect(CONTEXT_TYPES.PATTERN).toBe('pattern');
    expect(CONTEXT_TYPES.DOCUMENTATION).toBe('documentation');
    expect(CONTEXT_TYPES.HISTORY).toBe('history');
  });
});
