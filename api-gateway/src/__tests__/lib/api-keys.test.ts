import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  generateKey,
  validateKey,
  revokeKey,
  deleteKey,
  listKeys,
  getKey,
  setStorePath,
  flush,
  _resetForTest,
} from '../../lib/api-keys';

describe('api-keys (hardened)', () => {
  let tmpDir: string;
  let tmpPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apikeys-'));
    tmpPath = path.join(tmpDir, 'keys.json');
    setStorePath(tmpPath);
    _resetForTest();
  });

  afterEach(() => {
    _resetForTest();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('generation', () => {
    it('returns a plaintext key in the expected format', () => {
      const { plaintextKey, info } = generateKey({ name: 'test-key' });
      expect(plaintextKey).toMatch(/^gywd_[a-f0-9]{16}_[a-f0-9]{64}$/);
      expect(info.name).toBe('test-key');
      expect(info.active).toBe(true);
      expect(info.scope).toBe('read'); // default
      expect(info.id).toMatch(/^[a-f0-9]{16}$/);
    });

    it('supports custom scope', () => {
      const { info } = generateKey({ name: 'admin-key', scope: 'admin' });
      expect(info.scope).toBe('admin');
    });

    it('supports expiresAt', () => {
      const future = new Date(Date.now() + 86400000).toISOString();
      const { info } = generateKey({ name: 'exp', expiresAt: future });
      expect(info.expiresAt).toBe(future);
    });

    it('records creator', () => {
      const { info } = generateKey({ name: 'key', createdBy: 'alice' });
      expect(info.createdBy).toBe('alice');
    });

    it('each key has a unique id', () => {
      const a = generateKey({ name: 'a' });
      const b = generateKey({ name: 'b' });
      expect(a.info.id).not.toBe(b.info.id);
    });
  });

  describe('validation', () => {
    it('validates a correct key', () => {
      const { plaintextKey, info } = generateKey({ name: 'valid' });
      const result = validateKey(plaintextKey);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(info.id);
      expect(result!.name).toBe('valid');
    });

    it('returns null for malformed key', () => {
      expect(validateKey('not-a-key')).toBeNull();
      expect(validateKey('gywd_short')).toBeNull();
      expect(validateKey('')).toBeNull();
    });

    it('returns null for unknown id', () => {
      const fake = 'gywd_0000000000000000_' + '0'.repeat(64);
      expect(validateKey(fake)).toBeNull();
    });

    it('returns null when secret does not match hash', () => {
      const { plaintextKey } = generateKey({ name: 'target' });
      // Keep valid id but replace secret
      const parts = plaintextKey.split('_');
      const tampered = `${parts[0]}_${parts[1]}_${'f'.repeat(64)}`;
      expect(validateKey(tampered)).toBeNull();
    });

    it('rejects revoked keys', () => {
      const { plaintextKey, info } = generateKey({ name: 'target' });
      revokeKey(info.id);
      expect(validateKey(plaintextKey)).toBeNull();
    });

    it('rejects expired keys', () => {
      const past = new Date(Date.now() - 1000).toISOString();
      const { plaintextKey } = generateKey({ name: 'expired', expiresAt: past });
      expect(validateKey(plaintextKey)).toBeNull();
    });

    it('increments requestCount on each validate', () => {
      const { plaintextKey, info } = generateKey({ name: 'counter' });
      validateKey(plaintextKey);
      validateKey(plaintextKey);
      validateKey(plaintextKey);
      flush(); // force debounced write
      const fetched = getKey(info.id);
      expect(fetched!.requestCount).toBe(3);
    });
  });

  describe('storage security', () => {
    it('does NOT store plaintext key in the file', () => {
      const { plaintextKey } = generateKey({ name: 'secret-test' });
      const raw = fs.readFileSync(tmpPath, 'utf8');
      expect(raw).not.toContain(plaintextKey);
      // Also should not contain the secret portion
      const secret = plaintextKey.split('_')[2];
      expect(raw).not.toContain(secret);
    });

    it('stores only scrypt hash + salt', () => {
      generateKey({ name: 'inspection' });
      const raw = JSON.parse(fs.readFileSync(tmpPath, 'utf8'));
      expect(raw[0].keyHash).toMatch(/^[a-f0-9]+$/);
      expect(raw[0].salt).toMatch(/^[a-f0-9]+$/);
      // hash + salt should be different for each key
      generateKey({ name: 'inspection2' });
      const raw2 = JSON.parse(fs.readFileSync(tmpPath, 'utf8'));
      expect(raw2[0].keyHash).not.toBe(raw2[1].keyHash);
      expect(raw2[0].salt).not.toBe(raw2[1].salt);
    });

    it('file mode is 0600 on POSIX', () => {
      if (process.platform === 'win32') return; // Windows doesn't support POSIX modes
      generateKey({ name: 'mode-test' });
      const stat = fs.statSync(tmpPath);
      const mode = stat.mode & 0o777;
      expect(mode).toBe(0o600);
    });
  });

  describe('timing-safe comparison', () => {
    it('two keys with same id-prefix but different secrets both fail', () => {
      const { plaintextKey } = generateKey({ name: 'a' });
      const id = plaintextKey.split('_')[1];
      // Construct a key with the same id but different secret
      const fake = `gywd_${id}_${'a'.repeat(64)}`;
      expect(validateKey(fake)).toBeNull();
    });
  });

  describe('listing and retrieval', () => {
    it('lists only metadata, never plaintext', () => {
      generateKey({ name: 'k1' });
      const list = listKeys();
      expect(list.length).toBe(1);
      expect((list[0] as unknown as { keyHash?: string }).keyHash).toBeUndefined();
      expect((list[0] as unknown as { salt?: string }).salt).toBeUndefined();
    });

    it('getKey returns null for unknown id', () => {
      expect(getKey('0000000000000000')).toBeNull();
    });

    it('deleteKey hard-removes from store', () => {
      const { info } = generateKey({ name: 'to-delete' });
      expect(deleteKey(info.id)).toBe(true);
      expect(getKey(info.id)).toBeNull();
    });
  });

  describe('revocation', () => {
    it('revokeKey returns false for unknown id', () => {
      expect(revokeKey('0000000000000000')).toBe(false);
    });

    it('soft-delete: key entry persists but cannot validate', () => {
      const { plaintextKey, info } = generateKey({ name: 'soft' });
      revokeKey(info.id);
      expect(getKey(info.id)!.active).toBe(false);
      expect(validateKey(plaintextKey)).toBeNull();
    });
  });
});
