// ==================== Global Memory Types ====================

export interface Pattern {
  id: string;
  type: string;
  pattern: string;
  confidence: number;
  occurrences: number;
  sources: string[];
  createdAt: string;
  lastSeen: string;
}

export interface ExpertiseEntry {
  level: number;
  observations: number;
  createdAt?: string;
  lastUpdated: string;
}

export interface PreferenceEntry {
  value: unknown;
  updatedAt: string;
}

export interface Project {
  path: string;
  name: string;
  metadata: Record<string, unknown>;
  registeredAt: string;
  lastAccessed: string;
  accessCount: number;
}

// ==================== Planning Types ====================

export interface PhaseInfo {
  current: number;
  total: number;
}

export interface PlanningState {
  phase: PhaseInfo | null;
  plan: { current: number; total: number } | null;
  focus: string | null;
  milestone: string | null;
  status: string | null;
  progress: number | null;
  version: string | null;
  lastActivity: string | null;
}

export interface PhaseEntry {
  number: number;
  title: string;
  status: string;
}

// ==================== Dashboard Types ====================

export interface MemoryStats {
  totalPatterns: number;
  patternTypes: string[];
  expertiseAreas: number;
  preferencesCount: number;
  projectsCount: number;
  highConfidencePatterns: number;
}

export interface DashboardStatus {
  state: PlanningState;
  memoryStats: MemoryStats;
  phases: PhaseEntry[];
}

export interface PatternClassification {
  consensus: Pattern[];
  emerging: Pattern[];
  outlier: Pattern[];
}

// ==================== SSE Types ====================

export type SSEEventType =
  | 'connected'
  | 'state_changed'
  | 'patterns_updated'
  | 'feedback_updated'
  | 'heartbeat';

export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
  timestamp: string;
}

// ==================== API Response Types ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
