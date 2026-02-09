import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateQuery, validateBody } from '../../middleware/validate';

function createMocks(query: Record<string, unknown> = {}, body: Record<string, unknown> = {}) {
  const req = { query, body } as unknown as Request;
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

describe('validateQuery', () => {
  const schema = z.object({
    limit: z.coerce.number().optional(),
  }).passthrough();

  it('passes valid query', () => {
    const { req, res, next } = createMocks({ limit: '10' });
    validateQuery(schema)(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects invalid query', () => {
    const strictSchema = z.object({ limit: z.coerce.number() });
    const { req, res, next } = createMocks({ limit: 'abc' });
    validateQuery(strictSchema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('validateBody', () => {
  const schema = z.object({
    name: z.string().min(1),
  });

  it('passes valid body', () => {
    const { req, res, next } = createMocks({}, { name: 'test' });
    validateBody(schema)(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects invalid body', () => {
    const { req, res, next } = createMocks({}, { name: '' });
    validateBody(schema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects missing required field', () => {
    const { req, res, next } = createMocks({}, {});
    validateBody(schema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
