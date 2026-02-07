import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type {
  Pattern,
  ExpertiseEntry,
  PreferenceEntry,
  Project,
  PlanningState,
  PhaseEntry,
  MemoryStats,
  PatternClassification,
} from './types';

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
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content) as T;
    }
  } catch {
    // Return default on error
  }
  return defaultValue;
}

function readTextFile(filePath: string): string | null {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
  } catch {
    // Return null on error
  }
  return null;
}

// ==================== Global Memory Readers ====================

export function getPatterns(): Pattern[] {
  return readJsonFile<Pattern[]>(path.join(getGlobalDir(), 'patterns.json'), []);
}

export function getExpertise(): Record<string, ExpertiseEntry> {
  return readJsonFile<Record<string, ExpertiseEntry>>(
    path.join(getGlobalDir(), 'expertise.json'),
    {}
  );
}

export function getPreferences(): Record<string, PreferenceEntry> {
  return readJsonFile<Record<string, PreferenceEntry>>(
    path.join(getGlobalDir(), 'preferences.json'),
    {}
  );
}

export function getProjects(): Project[] {
  return readJsonFile<Project[]>(path.join(getGlobalDir(), 'projects.json'), []);
}

// ==================== Memory Stats ====================

export function getMemoryStats(): MemoryStats {
  const patterns = getPatterns();
  const expertise = getExpertise();
  const preferences = getPreferences();
  const projects = getProjects();

  return {
    totalPatterns: patterns.length,
    patternTypes: [...new Set(patterns.map(p => p.type))],
    expertiseAreas: Object.keys(expertise).length,
    preferencesCount: Object.keys(preferences).length,
    projectsCount: projects.length,
    highConfidencePatterns: patterns.filter(p => p.confidence >= 0.7).length,
  };
}

// ==================== Pattern Classification ====================

export function classifyPatterns(): PatternClassification {
  const patterns = getPatterns();

  return {
    consensus: patterns.filter(p => p.confidence >= 0.7 && p.occurrences >= 3),
    emerging: patterns.filter(p => p.confidence >= 0.4 && p.confidence < 0.7),
    outlier: patterns.filter(p => p.confidence < 0.4 || p.occurrences <= 1),
  };
}

// ==================== Planning State Parser ====================

export function parseState(): PlanningState {
  const content = readTextFile(path.join(getPlanningDir(), 'STATE.md'));

  const state: PlanningState = {
    phase: null,
    plan: null,
    focus: null,
    milestone: null,
    status: null,
    progress: null,
    version: null,
    lastActivity: null,
  };

  if (!content) return state;

  const phaseMatch = content.match(/\*\*Phase:\*\*\s*(\d+)\s*of\s*(\d+)/);
  if (phaseMatch) {
    state.phase = { current: parseInt(phaseMatch[1]), total: parseInt(phaseMatch[2]) };
  }

  const planMatch = content.match(/\*\*Plan:\*\*\s*(\d+)\s*of\s*(\d+)/);
  if (planMatch) {
    state.plan = { current: parseInt(planMatch[1]), total: parseInt(planMatch[2]) };
  }

  const focusMatch = content.match(/\*\*Focus:\*\*\s*(.+)/);
  if (focusMatch) {
    state.focus = focusMatch[1].trim();
  }

  const milestoneMatch = content.match(/\*\*Current milestone:\*\*\s*(.+)/);
  if (milestoneMatch) {
    state.milestone = milestoneMatch[1].trim();
  }

  const statusMatch = content.match(/\*\*Status:\*\*\s*(.+)/);
  if (statusMatch) {
    state.status = statusMatch[1].trim();
  }

  const progressMatch = content.match(/(\d+)%\s*overall/);
  if (progressMatch) {
    state.progress = parseInt(progressMatch[1]);
  }

  const versionMatch = content.match(/\|\s*Version\s*\|\s*v?([\d.]+)\s*\(current\)/);
  if (versionMatch) {
    state.version = versionMatch[1];
  }

  const activityMatch = content.match(/Last activity:\s*(\d{4}-\d{2}-\d{2})/);
  if (activityMatch) {
    state.lastActivity = activityMatch[1];
  }

  return state;
}

// ==================== Phase Table Parser ====================

export function parsePhases(): PhaseEntry[] {
  const content = readTextFile(path.join(getPlanningDir(), 'STATE.md'));
  if (!content) return [];

  const phases: PhaseEntry[] = [];
  const tableRegex = /\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|/g;
  let match;

  while ((match = tableRegex.exec(content)) !== null) {
    const num = parseInt(match[1]);
    if (!isNaN(num)) {
      phases.push({
        number: num,
        title: match[2].trim(),
        status: match[3].trim(),
      });
    }
  }

  return phases;
}

// ==================== Roadmap Reader ====================

export function getRoadmap(): string | null {
  return readTextFile(path.join(getPlanningDir(), 'ROADMAP.md'));
}

// ==================== File Paths for Watching ====================

export function getWatchPaths(): string[] {
  const globalDir = getGlobalDir();
  const planningDir = getPlanningDir();
  return [
    path.join(planningDir, 'STATE.md'),
    path.join(globalDir, 'patterns.json'),
    path.join(globalDir, 'expertise.json'),
    path.join(globalDir, 'preferences.json'),
    path.join(globalDir, 'projects.json'),
  ];
}
