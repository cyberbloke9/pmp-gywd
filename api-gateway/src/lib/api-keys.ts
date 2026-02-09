import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';

const KEYS_FILE = path.join(os.homedir(), '.gywd', 'api-keys.json');

export interface ApiKeyEntry {
  key: string;
  name: string;
  createdAt: string;
  lastUsed: string | null;
  requestCount: number;
  active: boolean;
}

function ensureDir(): void {
  const dir = path.dirname(KEYS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadKeys(): ApiKeyEntry[] {
  try {
    if (fs.existsSync(KEYS_FILE)) {
      return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
    }
  } catch {
    // Return empty
  }
  return [];
}

function saveKeys(keys: ApiKeyEntry[]): void {
  ensureDir();
  fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2), 'utf8');
}

export function generateKey(name: string): ApiKeyEntry {
  const keys = loadKeys();
  const entry: ApiKeyEntry = {
    key: `gywd_${uuidv4().replace(/-/g, '')}`,
    name,
    createdAt: new Date().toISOString(),
    lastUsed: null,
    requestCount: 0,
    active: true,
  };
  keys.push(entry);
  saveKeys(keys);
  return entry;
}

export function validateKey(key: string): ApiKeyEntry | null {
  const keys = loadKeys();
  const entry = keys.find(k => k.key === key && k.active);
  if (entry) {
    entry.lastUsed = new Date().toISOString();
    entry.requestCount++;
    saveKeys(keys);
  }
  return entry || null;
}

export function revokeKey(key: string): boolean {
  const keys = loadKeys();
  const entry = keys.find(k => k.key === key);
  if (entry) {
    entry.active = false;
    saveKeys(keys);
    return true;
  }
  return false;
}

export function listKeys(): ApiKeyEntry[] {
  return loadKeys().map(k => ({
    ...k,
    key: k.key.substring(0, 12) + '...',
  }));
}

export function getKeysFilePath(): string {
  return KEYS_FILE;
}
