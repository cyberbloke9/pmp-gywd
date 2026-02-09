import * as fs from 'fs';

jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

import { generateKey, validateKey, revokeKey, listKeys } from '../../lib/api-keys';

describe('api-keys', () => {
  let keyStore: string;

  beforeEach(() => {
    jest.clearAllMocks();
    keyStore = '[]';
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockImplementation(() => keyStore);
    mockFs.writeFileSync.mockImplementation((_path, data) => {
      keyStore = data as string;
    });
    mockFs.mkdirSync.mockImplementation(() => undefined as unknown as string);
  });

  it('generates a key with gywd_ prefix', () => {
    const entry = generateKey('test-key');
    expect(entry.key).toMatch(/^gywd_/);
    expect(entry.name).toBe('test-key');
    expect(entry.active).toBe(true);
  });

  it('validates a generated key', () => {
    const entry = generateKey('my-key');
    const result = validateKey(entry.key);
    expect(result).not.toBeNull();
    expect(result?.name).toBe('my-key');
  });

  it('returns null for invalid key', () => {
    expect(validateKey('nonexistent')).toBeNull();
  });

  it('revokes a key', () => {
    const entry = generateKey('revoke-me');
    expect(revokeKey(entry.key)).toBe(true);
    expect(validateKey(entry.key)).toBeNull();
  });

  it('returns false for revoking nonexistent key', () => {
    expect(revokeKey('nope')).toBe(false);
  });

  it('lists keys with masked values', () => {
    generateKey('listed');
    const keys = listKeys();
    expect(keys.length).toBeGreaterThan(0);
    expect(keys[0].key).toContain('...');
  });

  it('increments request count on validate', () => {
    const entry = generateKey('counter');
    validateKey(entry.key);
    validateKey(entry.key);
    // The store should reflect updated counts
    const stored = JSON.parse(keyStore);
    const found = stored.find((k: { name: string }) => k.name === 'counter');
    expect(found.requestCount).toBe(2);
  });
});
