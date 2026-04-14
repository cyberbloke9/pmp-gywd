import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

process.env.GYWD_API_AUTH = 'disabled';
process.env.NODE_ENV = 'development';
process.env.GYWD_DISABLE_RATE_LIMIT = 'true';

import { createApp } from '../../app';
import { escapeRegex, atomicWriteFileSync, withStateLock } from '../../routes/commands';
import http from 'http';

const app = createApp();
app.locals.wsManager = { broadcast: jest.fn() };

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
          try { resolve({ status: res.statusCode || 500, body: data ? JSON.parse(data) : {} }); }
          catch { resolve({ status: res.statusCode || 500, body: { raw: data } }); }
        });
      });
      req.on('error', (err) => { server.close(); reject(err); });
      if (postData) req.write(postData);
      req.end();
    });
  });
}

describe('Commands Security', () => {
  describe('Fix #1: Regex injection in mark-phase', () => {
    it('escapeRegex escapes regex special chars', () => {
      expect(escapeRegex('.*')).toBe('\\.\\*');
      expect(escapeRegex('a+)+$')).toBe('a\\+\\)\\+\\$');
      expect(escapeRegex('5')).toBe('5');
    });

    it('rejects non-numeric phase', async () => {
      const res = await request('POST', '/api/v1/commands/execute', {
        action: 'mark-phase',
        params: { phase: '.*', status: 'pwned' },
      });
      expect(res.status).toBe(500);
      expect(res.body.error).toContain('positive integer');
    });

    it('rejects ReDoS attack pattern in phase', async () => {
      const res = await request('POST', '/api/v1/commands/execute', {
        action: 'mark-phase',
        params: { phase: 'a+)+$', status: 'x' },
      });
      expect(res.status).toBe(500);
      expect(res.body.error).toContain('positive integer');
    });

    it('rejects very long phase strings', async () => {
      const res = await request('POST', '/api/v1/commands/execute', {
        action: 'mark-phase',
        params: { phase: '1'.repeat(50), status: 'x' },
      });
      expect(res.status).toBe(400);
    });
  });

  describe('Fix #2: Path traversal on GET /commands/:name', () => {
    it('rejects ../ path traversal', async () => {
      const res = await request('GET', '/api/v1/commands/..%2F..%2Fpackage');
      expect([400, 404]).toContain(res.status);
      // Either rejected (400) or not found (404), but never 200 with arbitrary file
      expect(res.body.success).toBe(false);
    });

    it('rejects backslash path traversal', async () => {
      const res = await request('GET', '/api/v1/commands/..%5C..%5Cpackage');
      expect([400, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('rejects null byte injection', async () => {
      const res = await request('GET', '/api/v1/commands/help%00.txt');
      expect([400, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('rejects empty name', async () => {
      const res = await request('GET', '/api/v1/commands/');
      // The GET / route catches this; should list commands or 404 — never read arbitrary files
      expect([200, 404]).toContain(res.status);
    });

    it('rejects very long names', async () => {
      const longName = 'a'.repeat(150);
      const res = await request('GET', `/api/v1/commands/${longName}`);
      expect([400, 404]).toContain(res.status);
    });
  });

  describe('Fix #3: Atomic writes + mutex', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gywd-atomic-'));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('atomicWriteFileSync writes correctly', () => {
      const target = path.join(tmpDir, 'test.txt');
      atomicWriteFileSync(target, 'hello world');
      expect(fs.readFileSync(target, 'utf8')).toBe('hello world');
    });

    it('atomicWriteFileSync overwrites existing file', () => {
      const target = path.join(tmpDir, 'test.txt');
      fs.writeFileSync(target, 'old content');
      atomicWriteFileSync(target, 'new content');
      expect(fs.readFileSync(target, 'utf8')).toBe('new content');
    });

    it('atomicWriteFileSync cleans up tmp file (no leftover)', () => {
      const target = path.join(tmpDir, 'test.txt');
      atomicWriteFileSync(target, 'hello');
      const files = fs.readdirSync(tmpDir);
      expect(files.length).toBe(1);
      expect(files[0]).toBe('test.txt');
    });

    it('withStateLock serializes concurrent operations', async () => {
      const order: number[] = [];
      const op = (id: number) => withStateLock(async () => {
        order.push(id);
        await new Promise((r) => setTimeout(r, 10));
        order.push(-id);
      });

      await Promise.all([op(1), op(2), op(3)]);

      // Each op's start and end must be adjacent (no interleave)
      for (let i = 0; i < order.length; i += 2) {
        expect(order[i]).toBe(-order[i + 1]);
      }
    });
  });

  describe('Fix #4: Zod validation + prototype pollution', () => {
    it('rejects unknown action', async () => {
      const res = await request('POST', '/api/v1/commands/execute', {
        action: 'unknown-action',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid');
    });

    it('rejects unknown top-level keys (strict mode)', async () => {
      const res = await request('POST', '/api/v1/commands/execute', {
        action: 'refresh-state',
        evil: 'payload',
      });
      expect(res.status).toBe(400);
    });

    it('strips __proto__ from body', async () => {
      const res = await request('POST', '/api/v1/commands/execute', {
        action: 'refresh-state',
        __proto__: { polluted: 'yes' },
      });
      // Should succeed (refresh-state) or fail validation, but never pollute Object.prototype
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
      // refresh-state has no params required
      expect([200, 400]).toContain(res.status);
    });

    it('rejects array as field (type confusion)', async () => {
      const res = await request('POST', '/api/v1/commands/execute', {
        action: 'update-state',
        params: { field: ['status'], value: 'x' },
      });
      expect(res.status).toBe(400);
    });

    it('rejects oversize value (DoS)', async () => {
      const res = await request('POST', '/api/v1/commands/execute', {
        action: 'update-state',
        params: { field: 'status', value: 'x'.repeat(10000) },
      });
      expect(res.status).toBe(400);
    });

    it('rejects oversize status (DoS)', async () => {
      const res = await request('POST', '/api/v1/commands/execute', {
        action: 'mark-phase',
        params: { phase: '1', status: 'x'.repeat(10000) },
      });
      expect(res.status).toBe(400);
    });
  });

  describe('Fix #5: Auth bypass gated by NODE_ENV', () => {
    const origEnv = { ...process.env };

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...origEnv };
    });

    afterAll(() => {
      process.env = origEnv;
    });

    it('allows bypass in NODE_ENV=development', () => {
      process.env.GYWD_API_AUTH = 'disabled';
      process.env.NODE_ENV = 'development';
      const { authMiddleware, _resetAuthWarning } = require('../../middleware/auth');
      _resetAuthWarning();

      const next = jest.fn();
      const statusFn = jest.fn().mockReturnThis();
      const jsonFn = jest.fn();
      const req = { path: '/api/v1/status', headers: {} } as Parameters<typeof authMiddleware>[0];
      const res = { status: statusFn, json: jsonFn } as unknown as Parameters<typeof authMiddleware>[1];
      authMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('rejects bypass in NODE_ENV=production without explicit opt-in', () => {
      process.env.GYWD_API_AUTH = 'disabled';
      process.env.NODE_ENV = 'production';
      delete process.env.GYWD_API_AUTH_ALLOW_PRODUCTION_BYPASS;
      const { authMiddleware, _resetAuthWarning } = require('../../middleware/auth');
      _resetAuthWarning();

      const next = jest.fn();
      const statusFn = jest.fn().mockReturnThis();
      const jsonFn = jest.fn();
      const req = { path: '/api/v1/status', headers: {} } as Parameters<typeof authMiddleware>[0];
      const res = { status: statusFn, json: jsonFn } as unknown as Parameters<typeof authMiddleware>[1];
      authMiddleware(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(statusFn).toHaveBeenCalledWith(401);
    });

    it('allows bypass in production with explicit opt-in', () => {
      process.env.GYWD_API_AUTH = 'disabled';
      process.env.NODE_ENV = 'production';
      process.env.GYWD_API_AUTH_ALLOW_PRODUCTION_BYPASS = 'yes';
      const { authMiddleware, _resetAuthWarning } = require('../../middleware/auth');
      _resetAuthWarning();

      const next = jest.fn();
      const statusFn = jest.fn().mockReturnThis();
      const jsonFn = jest.fn();
      const req = { path: '/api/v1/status', headers: {} } as Parameters<typeof authMiddleware>[0];
      const res = { status: statusFn, json: jsonFn } as unknown as Parameters<typeof authMiddleware>[1];
      authMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('still allows /health without auth', () => {
      process.env.GYWD_API_AUTH = '';
      process.env.NODE_ENV = 'production';
      const { authMiddleware, _resetAuthWarning } = require('../../middleware/auth');
      _resetAuthWarning();

      const next = jest.fn();
      const req = { path: '/health', headers: {} } as Parameters<typeof authMiddleware>[0];
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Parameters<typeof authMiddleware>[1];
      authMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
