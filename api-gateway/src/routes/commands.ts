import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

const router = Router();

// ---- Commands cache with mtime invalidation ----
interface CachedCommand {
  name: string;
  description: string;
  filename: string;
  mtimeMs: number;
}
const commandCache = new Map<string, CachedCommand>();

export function _clearCommandCache(): void {
  commandCache.clear();
}

// ---- Limits (DoS protection) ----
const MAX_VALUE_LENGTH = 200;
const MAX_FIELD_LENGTH = 50;
const MAX_PHASE_LENGTH = 10;
const MAX_STATUS_LENGTH = 50;

// ---- Mutex for STATE.md writes (prevents corruption from concurrent writes) ----
let stateWriteMutex: Promise<void> = Promise.resolve();

async function withStateLock<T>(fn: () => Promise<T> | T): Promise<T> {
  const release = stateWriteMutex;
  let resolveNext: () => void;
  stateWriteMutex = new Promise((r) => { resolveNext = r; });
  try {
    await release;
    return await fn();
  } finally {
    resolveNext!();
  }
}

// ---- Helpers ----

/** Escape a string for safe insertion into a regex pattern */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Atomic file write: write to .tmp then rename */
function atomicWriteFileSync(target: string, content: string): void {
  const tmp = `${target}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tmp, content, 'utf8');
  fs.renameSync(tmp, target);
}

function getCommandsDir(): string {
  return process.env.GYWD_COMMANDS_DIR || path.join(process.cwd(), 'commands', 'gywd');
}

function parseCommandFile(filePath: string): CachedCommand | null {
  try {
    const stat = fs.statSync(filePath);
    const cached = commandCache.get(filePath);
    if (cached && cached.mtimeMs === stat.mtimeMs) return cached;

    const content = fs.readFileSync(filePath, 'utf8');
    const filename = path.basename(filePath, '.md');
    const name = `gywd:${filename}`;

    const lines = content.split('\n').filter((l) => l.trim());
    let description = '';

    for (const line of lines) {
      const headingMatch = line.match(/^#+\s+(.+)/);
      if (headingMatch) {
        description = headingMatch[1].trim();
        break;
      }
      if (!description && line.trim() && !line.startsWith('#')) {
        description = line.trim().slice(0, 120);
        break;
      }
    }

    const entry: CachedCommand = { name, description: description || name, filename, mtimeMs: stat.mtimeMs };
    commandCache.set(filePath, entry);
    return entry;
  } catch {
    return null;
  }
}

/** GET /api/v1/commands - List available GYWD commands */
router.get('/', (_req, res) => {
  const commandsDir = getCommandsDir();

  if (!fs.existsSync(commandsDir)) {
    return res.json({
      success: true,
      data: { commands: [], total: 0 },
    });
  }

  const files = fs.readdirSync(commandsDir).filter((f) => f.endsWith('.md'));
  const commands = files
    .map((f) => parseCommandFile(path.join(commandsDir, f)))
    .filter(Boolean);

  return res.json({
    success: true,
    data: {
      commands,
      total: commands.length,
    },
  });
});

/** GET /api/v1/commands/:name - Get a single command's details */
router.get('/:name', (req, res) => {
  const commandsDir = getCommandsDir();
  const rawName = req.params.name.replace(/^gywd:/, '');

  // Reject path-traversal characters
  if (rawName.includes('/') || rawName.includes('\\') || rawName.includes('..') || rawName.includes('\0')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid command name: contains illegal characters',
    });
  }

  // Reject overly long names
  if (rawName.length === 0 || rawName.length > 100) {
    return res.status(400).json({
      success: false,
      error: 'Invalid command name: length must be 1-100 chars',
    });
  }

  const filename = rawName + '.md';
  const filePath = path.join(commandsDir, filename);

  // Containment check — resolved path must be inside commandsDir
  const resolvedFile = path.resolve(filePath);
  const resolvedDir = path.resolve(commandsDir);
  if (!resolvedFile.startsWith(resolvedDir + path.sep) && resolvedFile !== resolvedDir) {
    return res.status(400).json({
      success: false,
      error: 'Invalid command name: path traversal detected',
    });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      error: `Command not found: ${req.params.name}`,
    });
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const meta = parseCommandFile(filePath);

  return res.json({
    success: true,
    data: {
      ...meta,
      content,
    },
  });
});

// ---- Execute schema (Zod) ----

const ExecuteParamsSchema = z.object({
  field: z.string().max(MAX_FIELD_LENGTH).optional(),
  value: z.string().max(MAX_VALUE_LENGTH).optional(),
  phase: z.union([z.string().max(MAX_PHASE_LENGTH), z.number()]).optional(),
  status: z.string().max(MAX_STATUS_LENGTH).optional(),
}).strict(); // strict() rejects unknown keys

const ExecuteBodySchema = z.object({
  action: z.enum(['refresh-state', 'refresh-patterns', 'update-state', 'mark-phase']),
  params: ExecuteParamsSchema.optional(),
}).strict();

/** Strip prototype-pollution keys defensively (in addition to Zod's strict mode) */
function sanitizeKeys<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  const o = obj as Record<string, unknown>;
  // Use bracket notation to bypass TS optional-delete check
  delete (o as Record<string, unknown>)['__proto__'];
  delete (o as Record<string, unknown>)['constructor'];
  delete (o as Record<string, unknown>)['prototype'];
  return obj;
}

/**
 * POST /api/v1/commands/execute - Execute a GYWD action
 */
router.post('/execute', async (req, res) => {
  // Sanitize before parsing (defense in depth)
  const rawBody = sanitizeKeys(req.body || {});
  if (rawBody.params) sanitizeKeys(rawBody.params);

  // Validate with Zod
  const parsed = ExecuteBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: `Invalid request: ${parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')}`,
    });
  }

  const { action, params } = parsed.data;

  // Get wsManager from app.locals (set by server.ts on startup)
  const wsManager = req.app.locals.wsManager as
    | { broadcast: (event: string, data: unknown) => void }
    | undefined;

  try {
    const result = await executeAction(action, params || {});

    if (wsManager) {
      wsManager.broadcast('command_executed', {
        action,
        params,
        result: result.message,
        timestamp: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: `Action failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
});

interface ActionResult {
  action: string;
  message: string;
  data?: unknown;
}

async function executeAction(
  action: string,
  params: Record<string, unknown>,
): Promise<ActionResult> {
  const { parseState, getPatterns, getPlanningDir } = require('../lib/gywd-data');

  switch (action) {
    case 'refresh-state': {
      const state = parseState();
      return { action, message: 'State refreshed', data: { state } };
    }

    case 'refresh-patterns': {
      const patterns = getPatterns();
      return { action, message: 'Patterns refreshed', data: { count: patterns.length } };
    }

    case 'update-state': {
      const field = params.field as string | undefined;
      const value = params.value as string | undefined;

      if (!field || value === undefined || value === null) {
        throw new Error('update-state requires field and value params');
      }

      const planningDir = getPlanningDir();
      const statePath = path.join(planningDir, 'STATE.md');

      // Whitelist allowed fields
      const fieldPatterns: Record<string, RegExp> = {
        status: /\*\*Status:\*\*\s*[^\n]*/,
        focus: /\*\*Focus:\*\*\s*[^\n]*/,
      };

      const pattern = fieldPatterns[field];
      if (!pattern) {
        throw new Error(`Unknown field: ${field}. Supported: ${Object.keys(fieldPatterns).join(', ')}`);
      }

      // Strip newlines from value to prevent table corruption
      const cleanValue = value.replace(/[\r\n]+/g, ' ').slice(0, MAX_VALUE_LENGTH);

      return await withStateLock(() => {
        if (!fs.existsSync(statePath)) {
          throw new Error('STATE.md not found');
        }
        let content = fs.readFileSync(statePath, 'utf8');

        if (!pattern.test(content)) {
          throw new Error(`Field "${field}" not found in STATE.md`);
        }

        const fieldLabel = field.charAt(0).toUpperCase() + field.slice(1);
        // Use callback form to avoid $&/$1 backref interpretation
        content = content.replace(pattern, () => `**${fieldLabel}:** ${cleanValue}`);
        atomicWriteFileSync(statePath, content);

        return { action, message: `Updated ${field} to "${cleanValue}"`, data: { field, value: cleanValue } };
      });
    }

    case 'mark-phase': {
      const phaseRaw = params.phase as string | number | undefined;
      const phaseStatus = params.status as string | undefined;

      if (phaseRaw === undefined || !phaseStatus) {
        throw new Error('mark-phase requires phase and status params');
      }

      const phaseStr = String(phaseRaw).trim();
      if (!/^\d{1,5}$/.test(phaseStr)) {
        throw new Error('phase must be a positive integer (1-5 digits)');
      }
      if (phaseStatus.length > MAX_STATUS_LENGTH) {
        throw new Error(`status exceeds max length of ${MAX_STATUS_LENGTH}`);
      }

      const cleanStatus = phaseStatus.replace(/[\r\n|]/g, ' ');
      const planningDir2 = getPlanningDir();
      const statePath2 = path.join(planningDir2, 'STATE.md');

      return await withStateLock(() => {
        if (!fs.existsSync(statePath2)) {
          throw new Error('STATE.md not found');
        }
        let content2 = fs.readFileSync(statePath2, 'utf8');

        // Escape phase before regex construction (defense in depth — already validated as digits)
        const escapedPhase = escapeRegex(phaseStr);
        const phasePattern = new RegExp(`(\\|\\s*${escapedPhase}\\s*\\|[^|]+\\|)\\s*[^|]+\\s*\\|`);

        if (!phasePattern.test(content2)) {
          throw new Error(`Phase ${phaseStr} not found in STATE.md`);
        }

        // Use callback form to prevent $1/$& interpretation in cleanStatus
        content2 = content2.replace(phasePattern, (_match, p1) => `${p1} ${cleanStatus} |`);
        atomicWriteFileSync(statePath2, content2);

        return { action, message: `Phase ${phaseStr} marked as ${cleanStatus}`, data: { phase: phaseStr, status: cleanStatus } };
      });
    }

    default:
      throw new Error(`Unknown action: ${action}. Supported: refresh-state, refresh-patterns, update-state, mark-phase`);
  }
}

// Exported for tests
export { escapeRegex, atomicWriteFileSync, withStateLock };
export default router;
