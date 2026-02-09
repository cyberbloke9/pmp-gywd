import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

const TEST_GLOBAL = path.join(os.tmpdir(), 'gywd-api-test-global');
const TEST_PLANNING = path.join(os.tmpdir(), 'gywd-api-test-planning');
process.env.GYWD_GLOBAL_DIR = TEST_GLOBAL;
process.env.GYWD_PLANNING_DIR = TEST_PLANNING;

import {
  getPatterns, getExpertise, getPreferences, getProjects,
  getState, getRoadmap, parseState, getWatchPaths,
  getGlobalDir, getPlanningDir,
} from '../../lib/gywd-data';

describe('gywd-data', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns paths from env', () => {
    expect(getGlobalDir()).toBe(TEST_GLOBAL);
    expect(getPlanningDir()).toBe(TEST_PLANNING);
  });

  it('getPatterns returns empty array when missing', () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(getPatterns()).toEqual([]);
  });

  it('getPatterns returns parsed data', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('[{"id":"1"}]');
    expect(getPatterns()).toEqual([{ id: '1' }]);
  });

  it('getExpertise returns empty object when missing', () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(getExpertise()).toEqual({});
  });

  it('getPreferences returns empty object when missing', () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(getPreferences()).toEqual({});
  });

  it('getProjects returns empty array when missing', () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(getProjects()).toEqual([]);
  });

  it('getState returns null when missing', () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(getState()).toBeNull();
  });

  it('getRoadmap returns null when missing', () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(getRoadmap()).toBeNull();
  });

  it('parseState extracts fields from content', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      '**Phase:** 45 of 52\n**Focus:** API Gateway\n**Current milestone:** v5.0\n**Status:** In Progress\n85% overall'
    );
    const state = parseState();
    expect(state.phase).toEqual({ current: 45, total: 52 });
    expect(state.focus).toBe('API Gateway');
    expect(state.milestone).toBe('v5.0');
    expect(state.status).toBe('In Progress');
    expect(state.progress).toBe(85);
  });

  it('parseState returns nulls when file missing', () => {
    mockFs.existsSync.mockReturnValue(false);
    const state = parseState();
    expect(state.phase).toBeNull();
  });

  it('getWatchPaths returns expected paths', () => {
    const paths = getWatchPaths();
    expect(paths).toHaveLength(3);
    expect(paths[0]).toContain('STATE.md');
  });
});
