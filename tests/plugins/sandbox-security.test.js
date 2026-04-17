'use strict';

/**
 * Plugin sandbox security tests — verifies C5 fix:
 *   - vm-based sandbox enforces module allowlist
 *   - Forbidden core modules always blocked
 *   - Path traversal in manifest.main rejected
 *   - Prototype pollution in manifest stripped
 *   - Script timeout enforced
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { PluginLoader } = require('../../lib/plugins/plugin-loader');

function writePlugin(dir, { manifest = {}, code = 'module.exports = { init: () => {} };' } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'plugin.json'),
    JSON.stringify({ name: 'test', version: '1.0.0', main: 'index.js', ...manifest }),
  );
  fs.writeFileSync(path.join(dir, 'index.js'), code);
}

describe('Plugin sandbox security', () => {
  let tmpRoot;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-sandbox-'));
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  describe('manifest validation', () => {
    test('rejects main with path traversal', async () => {
      const p = path.join(tmpRoot, 'evil');
      writePlugin(p, { manifest: { main: '../../../etc/passwd' } });
      const loader = new PluginLoader();
      await expect(loader.load(p)).rejects.toThrow(/Invalid main/);
    });

    test('rejects absolute path main', async () => {
      const p = path.join(tmpRoot, 'evil2');
      writePlugin(p, { manifest: { main: '/etc/passwd' } });
      const loader = new PluginLoader();
      await expect(loader.load(p)).rejects.toThrow(/Invalid main/);
    });

    test('rejects main with null byte', async () => {
      const p = path.join(tmpRoot, 'evil3');
      writePlugin(p, { manifest: { main: 'index.js\0.txt' } });
      const loader = new PluginLoader();
      await expect(loader.load(p)).rejects.toThrow(/Invalid main/);
    });

    test('strips __proto__ from manifest JSON', async () => {
      const p = path.join(tmpRoot, 'proto');
      fs.mkdirSync(p, { recursive: true });
      // Manually write manifest with __proto__
      fs.writeFileSync(path.join(p, 'plugin.json'),
        '{"name":"x","version":"1.0.0","main":"index.js","__proto__":{"polluted":"yes"}}');
      fs.writeFileSync(path.join(p, 'index.js'), 'module.exports = { init: () => {} };');

      const loader = new PluginLoader();
      await loader.load(p);
      // Object.prototype should NOT be polluted
      expect(({}).polluted).toBeUndefined();
    });

    test('rejects oversized manifest', async () => {
      const p = path.join(tmpRoot, 'big');
      fs.mkdirSync(p, { recursive: true });
      const huge = 'A'.repeat(100 * 1024); // 100KB
      fs.writeFileSync(path.join(p, 'plugin.json'),
        `{"name":"x","version":"1.0.0","main":"index.js","description":"${huge}"}`);
      fs.writeFileSync(path.join(p, 'index.js'), 'module.exports = {};');
      const loader = new PluginLoader();
      await expect(loader.load(p)).rejects.toThrow(/too large/);
    });

    test('rejects invalid plugin id', async () => {
      const p = path.join(tmpRoot, 'bad-id');
      writePlugin(p, { manifest: { id: '../malicious' } });
      const loader = new PluginLoader();
      await expect(loader.load(p)).rejects.toThrow(/Invalid plugin id/);
    });
  });

  describe('sandbox isolation', () => {
    test('blocks child_process require', async () => {
      const p = path.join(tmpRoot, 'rce');
      writePlugin(p, {
        code: `
          require('child_process').execSync('touch /tmp/pwned');
          module.exports = { init: () => {} };
        `,
      });
      const loader = new PluginLoader();
      await expect(loader.load(p)).rejects.toThrow(/child_process.*forbidden|not in sandbox/i);
    });

    test('blocks net/tls/fs require by default', async () => {
      const p = path.join(tmpRoot, 'net');
      writePlugin(p, {
        code: `require('net'); module.exports = { init: () => {} };`,
      });
      const loader = new PluginLoader();
      await expect(loader.load(p)).rejects.toThrow(/net.*forbidden/i);
    });

    test('blocks fs require (not on default allowlist)', async () => {
      const p = path.join(tmpRoot, 'fs-attempt');
      writePlugin(p, {
        code: `require('fs'); module.exports = { init: () => {} };`,
      });
      const loader = new PluginLoader();
      await expect(loader.load(p)).rejects.toThrow(/fs.*not in sandbox/i);
    });

    test('allows safe core modules (path, events)', async () => {
      const p = path.join(tmpRoot, 'ok');
      writePlugin(p, {
        code: `
          const path = require('path');
          const { EventEmitter } = require('events');
          module.exports = { init: () => {}, path, EventEmitter };
        `,
      });
      const loader = new PluginLoader();
      const plugin = await loader.load(p);
      expect(plugin.instance.path).toBeDefined();
    });

    test('blocks external module not in peerDependencies', async () => {
      const p = path.join(tmpRoot, 'no-deps');
      writePlugin(p, {
        code: `require('jest'); module.exports = {};`,
      });
      const loader = new PluginLoader();
      await expect(loader.load(p)).rejects.toThrow(/not in plugin peerDependencies/);
    });

    test('allows external module IF declared in peerDependencies', async () => {
      const p = path.join(tmpRoot, 'with-dep');
      writePlugin(p, {
        manifest: { peerDependencies: { 'jest-util': '*' } },
        code: `const util = require('jest-util'); module.exports = { init: () => {}, util };`,
      });
      const loader = new PluginLoader();
      // This will still fail IF jest-util isn't installed in the test env — but the
      // gating check (is it in peerDeps?) passes.
      try {
        await loader.load(p);
      } catch (err) {
        // Only fail if the error is the sandbox gate, not module-not-found
        expect(err.message).not.toMatch(/peerDependencies/);
      }
    });

    test('blocks relative require that escapes plugin root', async () => {
      const p = path.join(tmpRoot, 'escape');
      writePlugin(p, {
        code: `require('../../../lib/memory'); module.exports = {};`,
      });
      const loader = new PluginLoader();
      await expect(loader.load(p)).rejects.toThrow(/escapes plugin root/);
    });

    test('disallows eval via codeGeneration.strings=false', async () => {
      const p = path.join(tmpRoot, 'eval');
      writePlugin(p, {
        code: `
          let result;
          try { eval('1+1'); result = { noThrow: true }; }
          catch (e) { result = { err: e.message }; }
          module.exports = { init: () => {}, ...result };
        `,
      });
      const loader = new PluginLoader();
      const plugin = await loader.load(p);
      // eval should throw in the sandbox
      expect(plugin.instance.err).toBeDefined();
      expect(plugin.instance.noThrow).toBeUndefined();
    });

    test('does not expose process.env', async () => {
      const p = path.join(tmpRoot, 'env');
      writePlugin(p, {
        code: `module.exports = { init: () => {}, env: process.env };`,
      });
      const loader = new PluginLoader();
      const plugin = await loader.load(p);
      expect(plugin.instance.env).toBeUndefined();
    });

    test('does not expose process.exit', async () => {
      const p = path.join(tmpRoot, 'exit');
      writePlugin(p, {
        code: `module.exports = { init: () => {}, hasExit: typeof process.exit === 'function' };`,
      });
      const loader = new PluginLoader();
      const plugin = await loader.load(p);
      expect(plugin.instance.hasExit).toBe(false);
    });

    test('enforces script timeout on infinite loop', async () => {
      const p = path.join(tmpRoot, 'loop');
      writePlugin(p, {
        code: `while (true) {} module.exports = {};`,
      });
      const loader = new PluginLoader({ scriptTimeoutMs: 200 });
      await expect(loader.load(p)).rejects.toThrow(/timed out|Script execution/i);
    }, 10000);
  });

  describe('trusted plugin mode (sandbox=false)', () => {
    test('trusted: true bypasses sandbox for first-party plugins', async () => {
      const p = path.join(tmpRoot, 'trusted');
      writePlugin(p, {
        code: `require('fs'); module.exports = { init: () => {} };`,
      });
      const loader = new PluginLoader();
      // Untrusted (default): fs is blocked
      await expect(loader.load(p)).rejects.toThrow();
      // With trusted:true, fs is allowed (full require)
      const plugin = await loader.load(p, { trusted: true });
      expect(plugin.trusted).toBe(true);
    });
  });

  describe('constructor guards', () => {
    test('rejects attempt to allow forbidden module', () => {
      expect(() => new PluginLoader({ allowedCoreModules: ['child_process'] }))
        .toThrow(/forbidden core module/);
    });
  });
});
