import * as fs from 'fs';

jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

jest.mock('../../lib/gywd-data', () => ({
  getWatchPaths: jest.fn(() => ['/tmp/STATE.md']),
  parseState: jest.fn(() => ({ phase: { current: 45, total: 52 } })),
  getPatterns: jest.fn(() => []),
}));

import { WsManager } from '../../lib/ws-manager';

describe('WsManager', () => {
  let manager: WsManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new WsManager();
    mockFs.existsSync.mockReturnValue(false);
    mockFs.watch.mockReturnValue({ close: jest.fn() } as unknown as fs.FSWatcher);
  });

  afterEach(() => {
    manager.close();
  });

  it('starts with zero clients', () => {
    expect(manager.getClientCount()).toBe(0);
  });

  it('close does not throw when not attached', () => {
    expect(() => manager.close()).not.toThrow();
  });
});
