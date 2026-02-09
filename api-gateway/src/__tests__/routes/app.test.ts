import * as fs from 'fs';

jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Disable auth for route tests
process.env.GYWD_API_AUTH = 'disabled';

import { createApp } from '../../app';
import http from 'http';

const app = createApp();

// Minimal supertest-like helper (no extra deps)
function request(method: string, path: string, body?: unknown): Promise<{ status: number; body: unknown; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') { server.close(); reject(new Error('No address')); return; }
      const port = addr.port;

      const options: http.RequestOptions = {
        hostname: 'localhost',
        port,
        path,
        method: method.toUpperCase(),
        headers: { 'Content-Type': 'application/json' },
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          server.close();
          try {
            resolve({
              status: res.statusCode || 500,
              body: data ? JSON.parse(data) : null,
              headers: res.headers as Record<string, string>,
            });
          } catch {
            resolve({ status: res.statusCode || 500, body: data, headers: res.headers as Record<string, string> });
          }
        });
      });
      req.on('error', (err) => { server.close(); reject(err); });
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  });
}

describe('API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
      const p = String(filePath);
      if (p.includes('patterns.json')) return '[]';
      if (p.includes('expertise.json')) return '{}';
      if (p.includes('preferences.json')) return '{}';
      if (p.includes('projects.json')) return '[]';
      if (p.includes('STATE.md')) return '**Phase:** 45 of 52\n**Status:** In Progress';
      if (p.includes('ROADMAP.md')) return '# Roadmap';
      return '{}';
    });
  });

  describe('GET /health', () => {
    it('returns ok status', async () => {
      const res = await request('GET', '/health');
      expect(res.status).toBe(200);
      expect((res.body as { status: string }).status).toBe('ok');
    });
  });

  describe('GET /api/v1/docs', () => {
    it('returns OpenAPI spec', async () => {
      const res = await request('GET', '/api/v1/docs');
      expect(res.status).toBe(200);
      expect((res.body as { openapi: string }).openapi).toBe('3.0.3');
    });
  });

  describe('GET /api/v1/status', () => {
    it('returns project status', async () => {
      const res = await request('GET', '/api/v1/status');
      expect(res.status).toBe(200);
      const body = res.body as { success: boolean; data: { state: { phase: { current: number } } } };
      expect(body.success).toBe(true);
      expect(body.data.state.phase.current).toBe(45);
    });
  });

  describe('GET /api/v1/memory', () => {
    it('returns all memory sections', async () => {
      const res = await request('GET', '/api/v1/memory');
      expect(res.status).toBe(200);
      const body = res.body as { data: Record<string, unknown> };
      expect(body.data).toHaveProperty('patterns');
      expect(body.data).toHaveProperty('expertise');
    });

    it('returns single section', async () => {
      const res = await request('GET', '/api/v1/memory?section=patterns');
      expect(res.status).toBe(200);
      const body = res.body as { data: Record<string, unknown> };
      expect(body.data).toHaveProperty('patterns');
      expect(body.data).not.toHaveProperty('expertise');
    });
  });

  describe('GET /api/v1/patterns', () => {
    it('returns classified patterns', async () => {
      const res = await request('GET', '/api/v1/patterns');
      expect(res.status).toBe(200);
      const body = res.body as { data: { classified: Record<string, unknown> } };
      expect(body.data.classified).toHaveProperty('consensus');
      expect(body.data.classified).toHaveProperty('emerging');
      expect(body.data.classified).toHaveProperty('outlier');
    });
  });

  describe('GET /api/v1/planning', () => {
    it('returns parsed state by default', async () => {
      const res = await request('GET', '/api/v1/planning');
      expect(res.status).toBe(200);
      const body = res.body as { data: { state: { phase: unknown } } };
      expect(body.data.state).toHaveProperty('phase');
    });

    it('returns raw roadmap', async () => {
      const res = await request('GET', '/api/v1/planning?file=roadmap');
      expect(res.status).toBe(200);
      const body = res.body as { data: { content: string } };
      expect(body.data.content).toContain('Roadmap');
    });
  });

  describe('404 handler', () => {
    it('returns 404 for unknown routes', async () => {
      const res = await request('GET', '/api/v1/nonexistent');
      expect(res.status).toBe(404);
    });
  });
});
