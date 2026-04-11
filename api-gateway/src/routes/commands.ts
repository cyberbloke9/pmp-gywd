import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

/**
 * Get the commands directory path.
 * Commands are .md files in commands/gywd/
 */
function getCommandsDir(): string {
  return process.env.GYWD_COMMANDS_DIR || path.join(process.cwd(), 'commands', 'gywd');
}

/**
 * Parse a command .md file to extract metadata.
 * Reads the first few lines for title/description.
 */
function parseCommandFile(filePath: string): { name: string; description: string; filename: string } | null {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const filename = path.basename(filePath, '.md');
    const name = `gywd:${filename}`;

    // Extract first heading or first non-empty line as description
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

    return { name, description: description || name, filename };
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
  const filename = req.params.name.replace(/^gywd:/, '') + '.md';
  const filePath = path.join(commandsDir, filename);

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

/**
 * POST /api/v1/commands/execute - Execute a GYWD action
 *
 * This does NOT run slash commands (those require Claude Code).
 * Instead, it performs supported dashboard actions:
 *   - "refresh-state": Re-read and broadcast current state
 *   - "refresh-patterns": Re-read and broadcast patterns
 *   - "update-state": Write a field to STATE.md
 *   - "mark-phase": Update phase status in STATE.md
 *
 * Body: { action: string, params?: object }
 */
router.post('/execute', (req, res) => {
  const { action, params } = req.body || {};

  if (!action || typeof action !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: action',
    });
  }

  // Import wsManager lazily to avoid circular deps
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  let wsManager: { broadcast: (event: string, data: unknown) => void } | null = null;
  try {
    const server = require('../server');
    wsManager = server.wsManager;
  } catch {
    // Server module not available (testing)
  }

  try {
    const result = executeAction(action, params || {});

    // Broadcast the execution event
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

function executeAction(action: string, params: Record<string, unknown>): ActionResult {
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
      const { field, value } = params;
      if (!field || !value) {
        throw new Error('update-state requires field and value params');
      }
      const planningDir = getPlanningDir();
      const statePath = path.join(planningDir, 'STATE.md');

      if (!fs.existsSync(statePath)) {
        throw new Error('STATE.md not found');
      }

      let content = fs.readFileSync(statePath, 'utf8');

      // Update known fields
      const fieldPatterns: Record<string, RegExp> = {
        status: /\*\*Status:\*\*\s*.+/,
        focus: /\*\*Focus:\*\*\s*.+/,
      };

      const pattern = fieldPatterns[field as string];
      if (!pattern) {
        throw new Error(`Unknown field: ${field}. Supported: ${Object.keys(fieldPatterns).join(', ')}`);
      }

      if (pattern.test(content)) {
        content = content.replace(pattern, `**${(field as string).charAt(0).toUpperCase() + (field as string).slice(1)}:** ${value}`);
        fs.writeFileSync(statePath, content, 'utf8');
        return { action, message: `Updated ${field} to "${value}"`, data: { field, value } };
      }

      throw new Error(`Field "${field}" not found in STATE.md`);
    }

    case 'mark-phase': {
      const { phase, status: phaseStatus } = params;
      if (!phase || !phaseStatus) {
        throw new Error('mark-phase requires phase and status params');
      }
      const planningDir2 = getPlanningDir();
      const statePath2 = path.join(planningDir2, 'STATE.md');

      if (!fs.existsSync(statePath2)) {
        throw new Error('STATE.md not found');
      }

      let content2 = fs.readFileSync(statePath2, 'utf8');
      const phasePattern = new RegExp(`(\\|\\s*${phase}\\s*\\|[^|]+\\|)\\s*[^|]+\\s*\\|`);

      if (phasePattern.test(content2)) {
        content2 = content2.replace(phasePattern, `$1 ${phaseStatus} |`);
        fs.writeFileSync(statePath2, content2, 'utf8');
        return { action, message: `Phase ${phase} marked as ${phaseStatus}`, data: { phase, status: phaseStatus } };
      }

      throw new Error(`Phase ${phase} not found in STATE.md`);
    }

    default:
      throw new Error(`Unknown action: ${action}. Supported: refresh-state, refresh-patterns, update-state, mark-phase`);
  }
}

export default router;
