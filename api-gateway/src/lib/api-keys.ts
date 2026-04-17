import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

/**
 * API Key Store — hardened per 2026-04-12 security audit.
 *
 * Security properties:
 *   - Keys are generated from 32 bytes of cryptographic entropy (crypto.randomBytes).
 *   - The key string is shown to the user ONCE (at generation) and NEVER stored.
 *   - Only scrypt-derived hashes are persisted (with per-key salt).
 *   - Lookup is O(1) by key-ID (the prefix in the key), not linear scan of all keys.
 *   - Verification uses crypto.timingSafeEqual to prevent timing side-channels.
 *   - File mode is 0600; directory 0700.
 *   - Usage counters (lastUsed, requestCount) are in-memory + debounce-flushed to disk
 *     to prevent per-request write races + amplified I/O.
 *   - Keys carry a `scope` (admin | write | read) enforced by gateway middleware.
 *   - Optional `expiresAt` for automatic expiry.
 *
 * Key format: `gywd_<id>_<secret>` where id is 16 hex chars (64 bits), secret is 32 bytes hex.
 */

const DEFAULT_KEYS_FILE = path.join(os.homedir(), '.gywd', 'api-keys.json');

export type ApiKeyScope = 'admin' | 'write' | 'read';

/** Data stored on disk (NO plaintext key). */
export interface StoredApiKey {
  id: string;                // 16-hex-char key ID (safe to show, embedded in key)
  name: string;
  scope: ApiKeyScope;
  keyHash: string;           // scrypt hash of secret
  salt: string;              // hex
  createdAt: string;
  expiresAt: string | null;
  lastUsed: string | null;
  requestCount: number;
  active: boolean;
  createdBy: string | null;  // userId of creator
}

/** Public info returned to API consumers (never the full key). */
export interface ApiKeyInfo {
  id: string;
  name: string;
  scope: ApiKeyScope;
  createdAt: string;
  expiresAt: string | null;
  lastUsed: string | null;
  requestCount: number;
  active: boolean;
  createdBy: string | null;
}

/** Generation result — the plaintext key is ONLY returned here and never stored. */
export interface GeneratedKey {
  plaintextKey: string;  // show to user once; not persisted
  info: ApiKeyInfo;
}

// ---- scrypt parameters (2024 guidance) ----
const SCRYPT_N = 16384;   // 2^14
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 32;

// ---- In-memory state ----
let storePath = DEFAULT_KEYS_FILE;
let cache: Map<string, StoredApiKey> | null = null;  // keyed by id
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let dirty = false;
const FLUSH_DEBOUNCE_MS = 500;

/** Override the storage path (for tests). */
export function setStorePath(p: string): void {
  storePath = p;
  cache = null;
}

function ensureDir(): void {
  const dir = path.dirname(storePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
}

function loadFromDisk(): Map<string, StoredApiKey> {
  try {
    if (fs.existsSync(storePath)) {
      const raw = fs.readFileSync(storePath, 'utf8');
      const arr: StoredApiKey[] = JSON.parse(raw);
      if (!Array.isArray(arr)) return new Map();
      const map = new Map<string, StoredApiKey>();
      for (const entry of arr) {
        if (entry && entry.id && entry.keyHash) map.set(entry.id, entry);
      }
      return map;
    }
  } catch {
    // empty map
  }
  return new Map();
}

function getCache(): Map<string, StoredApiKey> {
  if (!cache) cache = loadFromDisk();
  return cache;
}

function saveSync(): void {
  const map = getCache();
  const arr = [...map.values()];
  ensureDir();
  const tmp = `${storePath}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(arr, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, storePath);
  // Enforce mode even if file existed before
  try { fs.chmodSync(storePath, 0o600); } catch { /* non-POSIX */ }
  dirty = false;
}

function scheduleFlush(): void {
  dirty = true;
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    if (dirty) {
      try { saveSync(); } catch { /* logged elsewhere */ }
    }
  }, FLUSH_DEBOUNCE_MS);
}

/** Force a synchronous flush (test + shutdown path). */
export function flush(): void {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  if (dirty) saveSync();
}

// ---- Scrypt helpers ----

function scryptHash(secret: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(secret, salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }, (err, hash) => {
      if (err) reject(err); else resolve(hash);
    });
  });
}

function scryptHashSync(secret: string, salt: Buffer): Buffer {
  return crypto.scryptSync(secret, salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
}

// ---- Key parsing ----

function parseKeyString(key: string): { id: string; secret: string } | null {
  // Format: gywd_<id16hex>_<secret64hex>
  if (typeof key !== 'string' || key.length < 20 || key.length > 200) return null;
  const match = /^gywd_([a-f0-9]{16})_([a-f0-9]{64})$/i.exec(key);
  if (!match) return null;
  return { id: match[1].toLowerCase(), secret: match[2].toLowerCase() };
}

// ---- Public API ----

/**
 * Generate a new API key. The plaintext key is returned ONCE and never stored.
 */
export function generateKey(params: {
  name: string;
  scope?: ApiKeyScope;
  expiresAt?: string | null;
  createdBy?: string | null;
}): GeneratedKey {
  const id = crypto.randomBytes(8).toString('hex');          // 16 hex chars = 64 bits
  const secret = crypto.randomBytes(32).toString('hex');      // 64 hex chars = 256 bits
  const salt = crypto.randomBytes(16);
  const keyHash = scryptHashSync(secret, salt).toString('hex');

  const entry: StoredApiKey = {
    id,
    name: String(params.name || 'unnamed').slice(0, 128),
    scope: params.scope || 'read',
    keyHash,
    salt: salt.toString('hex'),
    createdAt: new Date().toISOString(),
    expiresAt: params.expiresAt || null,
    lastUsed: null,
    requestCount: 0,
    active: true,
    createdBy: params.createdBy || null,
  };

  getCache().set(id, entry);
  saveSync();

  return {
    plaintextKey: `gywd_${id}_${secret}`,
    info: toInfo(entry),
  };
}

/**
 * Validate a plaintext key. O(1) lookup by id; constant-time hash compare.
 * Returns full entry (NO plaintext) on success, null on failure.
 */
export function validateKey(key: string): ApiKeyInfo | null {
  const parsed = parseKeyString(key);
  if (!parsed) return null;

  const entry = getCache().get(parsed.id);
  if (!entry) return null;
  if (!entry.active) return null;
  if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) return null;

  const expected = Buffer.from(entry.keyHash, 'hex');
  const actual = scryptHashSync(parsed.secret, Buffer.from(entry.salt, 'hex'));
  if (expected.length !== actual.length) return null;
  if (!crypto.timingSafeEqual(expected, actual)) return null;

  // Update usage (in-memory only; debounced flush)
  entry.lastUsed = new Date().toISOString();
  entry.requestCount += 1;
  scheduleFlush();

  return toInfo(entry);
}

export function revokeKey(id: string): boolean {
  const entry = getCache().get(id);
  if (!entry) return false;
  entry.active = false;
  saveSync();
  return true;
}

export function deleteKey(id: string): boolean {
  const ok = getCache().delete(id);
  if (ok) saveSync();
  return ok;
}

export function getKey(id: string): ApiKeyInfo | null {
  const entry = getCache().get(id);
  return entry ? toInfo(entry) : null;
}

export function listKeys(): ApiKeyInfo[] {
  return [...getCache().values()].map(toInfo);
}

export function getKeysFilePath(): string {
  return storePath;
}

// ---- Test utilities ----

export function _resetForTest(): void {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  cache = null;
  dirty = false;
}

// ---- Private ----

function toInfo(entry: StoredApiKey): ApiKeyInfo {
  return {
    id: entry.id,
    name: entry.name,
    scope: entry.scope,
    createdAt: entry.createdAt,
    expiresAt: entry.expiresAt,
    lastUsed: entry.lastUsed,
    requestCount: entry.requestCount,
    active: entry.active,
    createdBy: entry.createdBy,
  };
}

// Optional async-capable generator (for hot paths in the future)
export async function generateKeyAsync(params: Parameters<typeof generateKey>[0]): Promise<GeneratedKey> {
  const id = crypto.randomBytes(8).toString('hex');
  const secret = crypto.randomBytes(32).toString('hex');
  const salt = crypto.randomBytes(16);
  const keyHash = (await scryptHash(secret, salt)).toString('hex');
  const entry: StoredApiKey = {
    id,
    name: String(params.name || 'unnamed').slice(0, 128),
    scope: params.scope || 'read',
    keyHash,
    salt: salt.toString('hex'),
    createdAt: new Date().toISOString(),
    expiresAt: params.expiresAt || null,
    lastUsed: null,
    requestCount: 0,
    active: true,
    createdBy: params.createdBy || null,
  };
  getCache().set(id, entry);
  saveSync();
  return { plaintextKey: `gywd_${id}_${secret}`, info: toInfo(entry) };
}
