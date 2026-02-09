import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/auth';

// Mock api-keys module
jest.mock('../../lib/api-keys', () => ({
  validateKey: jest.fn((key: string) =>
    key === 'valid-key' ? { key: 'valid-key', name: 'test', active: true } : null
  ),
}));

function createMocks(path = '/api/v1/status', apiKey?: string) {
  const req = {
    path,
    headers: apiKey ? { 'x-api-key': apiKey } : {},
  } as unknown as Request;
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

describe('authMiddleware', () => {
  const origAuth = process.env.GYWD_API_AUTH;

  afterEach(() => {
    if (origAuth === undefined) delete process.env.GYWD_API_AUTH;
    else process.env.GYWD_API_AUTH = origAuth;
  });

  it('skips auth for /health', () => {
    const { req, res, next } = createMocks('/health');
    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('skips auth for /api/v1/docs', () => {
    const { req, res, next } = createMocks('/api/v1/docs');
    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('skips auth when GYWD_API_AUTH=disabled', () => {
    process.env.GYWD_API_AUTH = 'disabled';
    const { req, res, next } = createMocks('/api/v1/status');
    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 401 when no API key', () => {
    const { req, res, next } = createMocks('/api/v1/status');
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 for invalid key', () => {
    const { req, res, next } = createMocks('/api/v1/status', 'bad-key');
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('passes through with valid key', () => {
    const { req, res, next } = createMocks('/api/v1/status', 'valid-key');
    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
