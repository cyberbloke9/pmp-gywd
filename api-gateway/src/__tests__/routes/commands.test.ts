import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Disable auth for route tests
process.env.GYWD_API_AUTH = 'disabled';
process.env.NODE_ENV = 'development';

// Mock server module to prevent circular dep and provide mock wsManager
jest.mock('../../server', () => ({
  wsManager: {
    broadcast: jest.fn(),
  },
}));

import { createApp } from '../../app';
import http from 'http';

const app = createApp();

function request(method: string, urlPath: string, body?: unknown): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') { server.close(); reject(new Error('No address')); return; }
      const port = addr.port;

      const postData = body ? JSON.stringify(body) : undefined;
      const options: http.RequestOptions = {
        hostname: 'localhost',
        port,
        path: urlPath,
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        },
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk: string) => { data += chunk; });
        res.on('end', () => {
          server.close();
          try {
            resolve({
              status: res.statusCode || 500,
              body: data ? JSON.parse(data) : null,
            });
          } catch {
            resolve({ status: res.statusCode || 500, body: { raw: data } });
          }
        });
      });

      req.on('error', (err) => { server.close(); reject(err); });
      if (postData) req.write(postData);
      req.end();
    });
  });
}

describe('Commands API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/commands', () => {
    it('returns empty list when commands dir does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const res = await request('GET', '/api/v1/commands');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect((res.body.data as { total: number }).total).toBe(0);
    });

    it('lists command files', async () => {
      mockFs.existsSync.mockReturnValue(true);
      (mockFs.readdirSync as jest.Mock).mockReturnValue([
        'help.md',
        'progress.md',
        'not-md.txt',
      ]);
      mockFs.readFileSync.mockReturnValue('# Help\nShow available commands');

      const res = await request('GET', '/api/v1/commands');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data as { commands: Array<{ name: string }>; total: number };
      expect(data.total).toBe(2); // Only .md files
      expect(data.commands[0].name).toBe('gywd:help');
    });
  });

  describe('GET /api/v1/commands/:name', () => {
    it('returns 404 for unknown command', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const res = await request('GET', '/api/v1/commands/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('returns command content', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('# Help\nShow GYWD help');

      const res = await request('GET', '/api/v1/commands/help');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data as { name: string; content: string };
      expect(data.name).toBe('gywd:help');
      expect(data.content).toContain('Help');
    });
  });

  describe('POST /api/v1/commands/execute', () => {
    it('returns 400 without action', async () => {
      const res = await request('POST', '/api/v1/commands/execute', {});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 for unknown action', async () => {
      const res = await request('POST', '/api/v1/commands/execute', { action: 'unknown-action' });

      // Now Zod validates and returns 400 (was 500 with old custom error)
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('executes refresh-state', async () => {
      // Mock gywd-data
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('**Phase:** 54 of 60\n**Status:** In Progress');

      const res = await request('POST', '/api/v1/commands/execute', { action: 'refresh-state' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data as { action: string; message: string };
      expect(data.action).toBe('refresh-state');
      expect(data.message).toContain('refreshed');
    });

    it('executes refresh-patterns', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('[]');

      const res = await request('POST', '/api/v1/commands/execute', { action: 'refresh-patterns' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('broadcasts command_executed event via WS', async () => {
      const { wsManager } = require('../../server');
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('[]');

      await request('POST', '/api/v1/commands/execute', { action: 'refresh-patterns' });

      expect(wsManager.broadcast).toHaveBeenCalledWith(
        'command_executed',
        expect.objectContaining({
          action: 'refresh-patterns',
        }),
      );
    });

    it('update-state requires field and value', async () => {
      const res = await request('POST', '/api/v1/commands/execute', {
        action: 'update-state',
        params: { field: 'status' },
      });

      // Zod schema allows missing value (optional), but action handler throws → 500
      expect(res.status).toBe(500);
      expect(res.body.error).toContain('requires field and value');
    });
  });
});
