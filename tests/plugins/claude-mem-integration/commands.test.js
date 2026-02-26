'use strict';

/**
 * Command Tests for Claude-Mem Integration
 */

const { memSearch, parseArgs: parseSearchArgs, formatResults: formatSearchResults } = require('../../../lib/plugins/claude-mem-integration/commands/mem-search');
const { memSync: _memSync, parseArgs: parseSyncArgs, formatResults: formatSyncResults } = require('../../../lib/plugins/claude-mem-integration/commands/mem-sync');
const { memStatus, formatStatus, getPatternsByType } = require('../../../lib/plugins/claude-mem-integration/commands/mem-status');
const { memTimeline, parseArgs: parseTimelineArgs, formatTimeline } = require('../../../lib/plugins/claude-mem-integration/commands/mem-timeline');

describe('mem-search command', () => {
  describe('parseArgs', () => {
    it('should parse query from string', () => {
      const args = parseSearchArgs('test query');
      expect(args.query).toBe('test query');
    });

    it('should parse --type flag', () => {
      const args = parseSearchArgs('query --type observation');
      expect(args.query).toBe('query');
      expect(args.type).toBe('observation');
    });

    it('should parse --limit flag', () => {
      const args = parseSearchArgs('query --limit 50');
      expect(args.query).toBe('query');
      expect(args.limit).toBe(50);
    });

    it('should parse --project flag', () => {
      const args = parseSearchArgs('query --project my-project');
      expect(args.query).toBe('query');
      expect(args.project).toBe('my-project');
    });

    it('should parse multiple flags', () => {
      const args = parseSearchArgs('my query --type prompt --limit 10 --project test');
      expect(args.query).toBe('my query');
      expect(args.type).toBe('prompt');
      expect(args.limit).toBe(10);
      expect(args.project).toBe('test');
    });

    it('should return object as-is if not string', () => {
      const input = { query: 'test', limit: 20 };
      const args = parseSearchArgs(input);
      expect(args).toEqual(input);
    });

    it('should return empty object for null/undefined', () => {
      expect(parseSearchArgs(null)).toEqual({});
      expect(parseSearchArgs(undefined)).toEqual({});
    });
  });

  describe('formatResults', () => {
    it('should format search results', () => {
      const results = {
        count: 2,
        query: 'test',
        limit: 20,
        results: [
          { id: 1, title: 'Test Result 1', type: 'observation', project: 'proj1', created_at_epoch: Date.now() },
          { id: 2, title: 'Test Result 2', subtitle: 'A subtitle', type: 'prompt', project: 'proj2', created_at_epoch: Date.now() },
        ],
      };

      const output = formatSearchResults(results);

      expect(output).toContain('Search Results (2 found)');
      expect(output).toContain('#1 - Test Result 1');
      expect(output).toContain('#2 - Test Result 2');
      expect(output).toContain('A subtitle');
    });

    it('should handle empty results', () => {
      const output = formatSearchResults({ results: [] });
      expect(output).toBe('No results found.');
    });

    it('should handle null results', () => {
      const output = formatSearchResults(null);
      expect(output).toBe('No results found.');
    });

    it('should handle missing title', () => {
      const results = {
        count: 1,
        query: 'test',
        limit: 20,
        results: [
          { id: 1, type: 'observation', project: 'proj1', created_at_epoch: Date.now() },
        ],
      };

      const output = formatSearchResults(results);
      expect(output).toContain('Untitled');
    });
  });

  describe('memSearch', () => {
    it('should return error if no query provided', async () => {
      const result = await memSearch('', {});
      expect(result.success).toBe(false);
      expect(result.message).toContain('Usage');
    });

    it('should call plugin.search with parsed args', async () => {
      const mockPlugin = {
        search: jest.fn().mockResolvedValue({ count: 0, results: [] }),
      };

      await memSearch('test query --limit 10', mockPlugin);

      expect(mockPlugin.search).toHaveBeenCalledWith('test query', {
        type: undefined,
        limit: 10,
        project: undefined,
      });
    });

    it('should handle search errors', async () => {
      const mockPlugin = {
        search: jest.fn().mockRejectedValue(new Error('Search failed')),
      };

      const result = await memSearch('test', mockPlugin);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Search failed');
    });
  });
});

describe('mem-sync command', () => {
  describe('parseArgs', () => {
    it('should parse --full flag', () => {
      const args = parseSyncArgs('--full');
      expect(args.full).toBe(true);
    });

    it('should parse --since flag', () => {
      const args = parseSyncArgs('--since 2024-01-01');
      expect(args.since).toBe('2024-01-01');
    });

    it('should default full to false', () => {
      const args = parseSyncArgs('');
      expect(args.full).toBe(false);
    });

    it('should return object as-is if not string', () => {
      const input = { full: true, since: '2024-01-01' };
      const args = parseSyncArgs(input);
      expect(args).toEqual(input);
    });
  });

  describe('formatResults', () => {
    it('should format sync results', () => {
      const results = {
        fetched: 100,
        imported: 80,
        merged: 15,
        errors: 5,
        duration: 1234,
      };

      const output = formatSyncResults(results);

      expect(output).toContain('Sync Results');
      expect(output).toContain('100');
      expect(output).toContain('80');
      expect(output).toContain('15');
      expect(output).toContain('5');
      expect(output).toContain('1234ms');
    });

    it('should show warning for errors', () => {
      const results = {
        fetched: 100,
        imported: 95,
        merged: 0,
        errors: 5,
        lastError: 'Test error',
        duration: 1000,
      };

      const output = formatSyncResults(results);

      expect(output).toContain('Warning');
      expect(output).toContain('Test error');
    });
  });
});

describe('mem-status command', () => {
  describe('formatStatus', () => {
    it('should format connected status', () => {
      const status = {
        status: 'connected',
        config: { workerHost: '127.0.0.1', workerPort: 37777 },
        stats: {
          connectedAt: '2024-01-01T00:00:00Z',
          observationsReceived: 100,
          patternsImported: 50,
          errors: 2,
          lastSync: '2024-01-01T12:00:00Z',
        },
        syncManagerStats: {
          queueLength: 5,
          queued: 100,
          synced: 95,
          dropped: 0,
          batches: 10,
          state: 'running',
        },
      };

      const output = formatStatus(status);

      expect(output).toContain('Claude-Mem Integration Status');
      expect(output).toContain('🟢');
      expect(output).toContain('connected');
      expect(output).toContain('127.0.0.1:37777');
    });

    it('should show disconnected status', () => {
      const status = {
        status: 'disconnected',
        config: { workerHost: '127.0.0.1', workerPort: 37777 },
        stats: {},
      };

      const output = formatStatus(status);

      expect(output).toContain('🔴');
      expect(output).toContain('disconnected');
    });

    it('should show error status', () => {
      const status = {
        status: 'error',
        config: { workerHost: '127.0.0.1', workerPort: 37777 },
        stats: {},
      };

      const output = formatStatus(status);

      expect(output).toContain('❌');
    });

    it('should show sync manager stats', () => {
      const status = {
        status: 'connected',
        config: { workerHost: '127.0.0.1', workerPort: 37777 },
        stats: {},
        syncManagerStats: {
          queueLength: 10,
          queued: 200,
          synced: 190,
          dropped: 5,
          batches: 20,
          state: 'running',
          lastError: 'Some error',
        },
      };

      const output = formatStatus(status);

      expect(output).toContain('Queue Status');
      expect(output).toContain('10');
      expect(output).toContain('200');
      expect(output).toContain('190');
      expect(output).toContain('Some error');
    });

    it('should show patterns by type', () => {
      const status = {
        status: 'connected',
        config: { workerHost: '127.0.0.1', workerPort: 37777 },
        stats: {},
        patternsByType: {
          'tool:read': 50,
          'tool:write': 30,
          'tool:bash': 20,
        },
      };

      const output = formatStatus(status);

      expect(output).toContain('Imported Patterns by Type');
      expect(output).toContain('tool:read');
      expect(output).toContain('50');
    });

    it('should handle no patterns', () => {
      const status = {
        status: 'connected',
        config: { workerHost: '127.0.0.1', workerPort: 37777 },
        stats: {},
        patternsByType: {},
      };

      const output = formatStatus(status);

      expect(output).toContain('No patterns imported yet');
    });
  });

  describe('getPatternsByType', () => {
    it('should return empty object if globalMemory not available', () => {
      const plugin = { globalMemory: null };
      const counts = getPatternsByType(plugin);
      expect(counts).toEqual({});
    });
  });

  describe('memStatus', () => {
    it('should return status from plugin', async () => {
      const mockPlugin = {
        getStatus: jest.fn().mockReturnValue({
          status: 'connected',
          config: { workerHost: '127.0.0.1', workerPort: 37777 },
          stats: {},
        }),
        globalMemory: null,
      };

      const result = await memStatus({}, mockPlugin);

      expect(result.success).toBe(true);
      expect(result.output).toContain('connected');
    });

    it('should handle errors', async () => {
      const mockPlugin = {
        getStatus: jest.fn().mockImplementation(() => {
          throw new Error('Status error');
        }),
      };

      const result = await memStatus({}, mockPlugin);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Status error');
    });
  });
});

describe('mem-timeline command', () => {
  describe('parseArgs', () => {
    it('should parse --anchor flag', () => {
      const args = parseTimelineArgs('--anchor 123');
      expect(args.anchor).toBe(123);
    });

    it('should parse --query flag', () => {
      const args = parseTimelineArgs('--query test');
      expect(args.query).toBe('test');
    });

    it('should parse --depth flag', () => {
      const args = parseTimelineArgs('--depth 10');
      expect(args.depth_before).toBe(10);
      expect(args.depth_after).toBe(10);
    });

    it('should parse --project flag', () => {
      const args = parseTimelineArgs('--project my-project');
      expect(args.project).toBe('my-project');
    });

    it('should return object as-is if not string', () => {
      const input = { anchor: 123 };
      const args = parseTimelineArgs(input);
      expect(args).toEqual(input);
    });
  });

  describe('formatTimeline', () => {
    it('should format timeline results', () => {
      const now = Date.now();
      const results = {
        count: 2,
        results: [
          { id: 1, title: 'Item 1', type: 'observation', project: 'proj1', created_at_epoch: now },
          { id: 2, title: 'Item 2', type: 'session', project: 'proj2', created_at_epoch: now },
        ],
      };

      const output = formatTimeline(results);

      expect(output).toContain('Timeline (2 items)');
      expect(output).toContain('#1');
      expect(output).toContain('#2');
      expect(output).toContain('Item 1');
      expect(output).toContain('Item 2');
    });

    it('should handle empty results', () => {
      const output = formatTimeline({ results: [] });
      expect(output).toBe('No timeline data found.');
    });

    it('should handle null results', () => {
      const output = formatTimeline(null);
      expect(output).toBe('No timeline data found.');
    });

    it('should show type icons', () => {
      const results = {
        count: 4,
        results: [
          { id: 1, title: 'Obs', type: 'observation', created_at_epoch: Date.now() },
          { id: 2, title: 'Sess', type: 'session', created_at_epoch: Date.now() },
          { id: 3, title: 'Prompt', type: 'prompt', created_at_epoch: Date.now() },
          { id: 4, title: 'Summary', type: 'summary', created_at_epoch: Date.now() },
        ],
      };

      const output = formatTimeline(results);

      expect(output).toContain('🔵'); // observation
      expect(output).toContain('📋'); // session
      expect(output).toContain('💬'); // prompt
      expect(output).toContain('📝'); // summary
    });

    it('should show project info', () => {
      const results = {
        count: 1,
        results: [
          { id: 1, title: 'Item', type: 'observation', project: 'test-project', created_at_epoch: Date.now() },
        ],
      };

      const output = formatTimeline(results);

      expect(output).toContain('📁 test-project');
    });

    it('should show query at bottom', () => {
      const results = {
        count: 1,
        query: 'search term',
        results: [
          { id: 1, title: 'Item', type: 'observation', created_at_epoch: Date.now() },
        ],
      };

      const output = formatTimeline(results);

      expect(output).toContain('Query: "search term"');
    });

    it('should group by date', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const results = {
        count: 2,
        results: [
          { id: 1, title: 'Today', type: 'observation', created_at_epoch: today.getTime() },
          { id: 2, title: 'Yesterday', type: 'observation', created_at_epoch: yesterday.getTime() },
        ],
      };

      const output = formatTimeline(results);

      // Should have date headers (format depends on locale)
      expect(output).toContain('###');
    });
  });

  describe('memTimeline', () => {
    it('should call plugin.getTimeline with defaults', async () => {
      const mockPlugin = {
        getTimeline: jest.fn().mockResolvedValue({ count: 0, results: [] }),
      };

      await memTimeline('', mockPlugin);

      expect(mockPlugin.getTimeline).toHaveBeenCalledWith(expect.objectContaining({
        limit: 50,
        depth_before: 5,
        depth_after: 5,
      }));
    });

    it('should handle timeline errors', async () => {
      const mockPlugin = {
        getTimeline: jest.fn().mockRejectedValue(new Error('Timeline error')),
      };

      const result = await memTimeline('', mockPlugin);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Timeline failed');
    });
  });
});
