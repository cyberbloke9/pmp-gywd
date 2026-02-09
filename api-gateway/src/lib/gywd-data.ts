import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ==================== Path Resolution ====================

export function getGlobalDir(): string {
  return process.env.GYWD_GLOBAL_DIR || path.join(os.homedir(), '.gywd', 'global');
}

export function getPlanningDir(): string {
  return process.env.GYWD_PLANNING_DIR || path.join(process.cwd(), '.planning');
}

// ==================== File Readers ====================

function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
    }
  } catch {
    // Return default
  }
  return defaultValue;
}

function readTextFile(filePath: string): string | null {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
  } catch {
    // Return null
  }
  return null;
}

// ==================== Data Accessors ====================

export function getPatterns(): unknown[] {
  return readJsonFile(path.join(getGlobalDir(), 'patterns.json'), []);
}

export function getExpertise(): Record<string, unknown> {
  return readJsonFile(path.join(getGlobalDir(), 'expertise.json'), {});
}

export function getPreferences(): Record<string, unknown> {
  return readJsonFile(path.join(getGlobalDir(), 'preferences.json'), {});
}

export function getProjects(): unknown[] {
  return readJsonFile(path.join(getGlobalDir(), 'projects.json'), []);
}

export function getState(): string | null {
  return readTextFile(path.join(getPlanningDir(), 'STATE.md'));
}

export function getRoadmap(): string | null {
  return readTextFile(path.join(getPlanningDir(), 'ROADMAP.md'));
}

// ==================== Parsed State ====================

export interface ParsedState {
  phase: { current: number; total: number } | null;
  plan: { current: number; total: number } | null;
  focus: string | null;
  milestone: string | null;
  status: string | null;
  progress: number | null;
}

export function parseState(): ParsedState {
  const content = getState();
  const state: ParsedState = {
    phase: null, plan: null, focus: null,
    milestone: null, status: null, progress: null,
  };
  if (!content) return state;

  const phaseMatch = content.match(/\*\*Phase:\*\*\s*(\d+)\s*of\s*(\d+)/);
  if (phaseMatch) state.phase = { current: parseInt(phaseMatch[1]), total: parseInt(phaseMatch[2]) };

  const planMatch = content.match(/\*\*Plan:\*\*\s*(\d+)\s*of\s*(\d+)/);
  if (planMatch) state.plan = { current: parseInt(planMatch[1]), total: parseInt(planMatch[2]) };

  const focusMatch = content.match(/\*\*Focus:\*\*\s*(.+)/);
  if (focusMatch) state.focus = focusMatch[1].trim();

  const milestoneMatch = content.match(/\*\*Current milestone:\*\*\s*(.+)/);
  if (milestoneMatch) state.milestone = milestoneMatch[1].trim();

  const statusMatch = content.match(/\*\*Status:\*\*\s*(.+)/);
  if (statusMatch) state.status = statusMatch[1].trim();

  const progressMatch = content.match(/(\d+)%\s*overall/);
  if (progressMatch) state.progress = parseInt(progressMatch[1]);

  return state;
}

// ==================== Watch Paths ====================

export function getWatchPaths(): string[] {
  return [
    path.join(getPlanningDir(), 'STATE.md'),
    path.join(getGlobalDir(), 'patterns.json'),
    path.join(getGlobalDir(), 'expertise.json'),
  ];
}
