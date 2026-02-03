#!/usr/bin/env node
'use strict';

/**
 * Claude-Mem Integration Test Script
 *
 * Tests the integration between GYWD and claude-mem worker.
 *
 * Usage:
 *   node scripts/test-claude-mem-integration.js
 *
 * Prerequisites:
 *   - claude-mem worker running on localhost:37777
 *   - Run: npx claude-mem worker
 */

const http = require('http');

const WORKER_HOST = '127.0.0.1';
const WORKER_PORT = 37777;
const BASE_URL = `http://${WORKER_HOST}:${WORKER_PORT}`;

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  dim: '\x1b[2m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logResult(test, passed, message = '') {
  const icon = passed ? '✓' : '✗';
  const color = passed ? 'green' : 'red';
  log(`  ${icon} ${test}${message ? `: ${message}` : ''}`, color);
  return passed;
}

async function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 5000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: () => Promise.resolve(JSON.parse(data)),
          text: () => Promise.resolve(data),
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testWorkerHealth() {
  log('\n1. Testing Worker Health...', 'blue');

  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    return logResult('Worker health check', response.ok, response.ok ? 'Worker is running' : `HTTP ${response.status}`);
  } catch (error) {
    return logResult('Worker health check', false, error.message);
  }
}

async function testSearchEndpoint() {
  log('\n2. Testing Search Endpoint...', 'blue');

  try {
    const response = await fetch(`${BASE_URL}/api/search?query=test&limit=5`);
    if (!response.ok) {
      return logResult('Search endpoint', false, `HTTP ${response.status}`);
    }

    const data = await response.json();
    return logResult('Search endpoint', true, `Found ${data.count || 0} results`);
  } catch (error) {
    return logResult('Search endpoint', false, error.message);
  }
}

async function testTimelineEndpoint() {
  log('\n3. Testing Timeline Endpoint...', 'blue');

  try {
    const response = await fetch(`${BASE_URL}/api/timeline?limit=10`);
    if (!response.ok) {
      return logResult('Timeline endpoint', false, `HTTP ${response.status}`);
    }

    const data = await response.json();
    return logResult('Timeline endpoint', true, `Found ${data.count || 0} items`);
  } catch (error) {
    return logResult('Timeline endpoint', false, error.message);
  }
}

async function testSSEStream() {
  log('\n4. Testing SSE Stream...', 'blue');

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      req.destroy();
      resolve(logResult('SSE stream', true, 'Connection established (no events in 2s)'));
    }, 2000);

    const req = http.request({
      hostname: WORKER_HOST,
      port: WORKER_PORT,
      path: '/stream',
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    }, (res) => {
      if (res.statusCode !== 200) {
        clearTimeout(timeout);
        resolve(logResult('SSE stream', false, `HTTP ${res.statusCode}`));
        return;
      }

      res.once('data', () => {
        clearTimeout(timeout);
        req.destroy();
        resolve(logResult('SSE stream', true, 'Receiving events'));
      });
    });

    req.on('error', (error) => {
      clearTimeout(timeout);
      resolve(logResult('SSE stream', false, error.message));
    });

    req.end();
  });
}

async function testPluginLoader() {
  log('\n5. Testing Plugin Loader...', 'blue');

  try {
    const { initPluginSystem, shutdownPluginSystem } = require('../lib/plugins/bootstrap');

    const { loader, results } = await initPluginSystem({ verbose: false });

    const claudeMemPlugin = results.loaded.find(p => p.id === 'claude-mem-integration');
    const passed = claudeMemPlugin !== undefined;

    logResult('Plugin loads', passed, passed ? `v${claudeMemPlugin.version}` : 'Not found');

    if (passed) {
      const commands = loader.getCommands();
      const memCommands = commands.filter(c => c.command.startsWith('claude-mem-integration:'));
      logResult('Commands registered', memCommands.length === 4, `${memCommands.length} commands`);
    }

    await shutdownPluginSystem();
    return passed;
  } catch (error) {
    return logResult('Plugin loads', false, error.message);
  }
}

async function runTests() {
  log('╔════════════════════════════════════════════════════════╗', 'blue');
  log('║      Claude-Mem Integration Test Suite                 ║', 'blue');
  log('╚════════════════════════════════════════════════════════╝', 'blue');

  const results = [];

  // Test 1: Worker health
  const workerHealthy = await testWorkerHealth();
  results.push(workerHealthy);

  if (!workerHealthy) {
    log('\n⚠️  Worker not running. Start it with:', 'yellow');
    log('   npx claude-mem worker', 'dim');
    log('\n   Skipping API tests...', 'dim');
  } else {
    // Test 2-4: API tests (only if worker is running)
    results.push(await testSearchEndpoint());
    results.push(await testTimelineEndpoint());
    results.push(await testSSEStream());
  }

  // Test 5: Plugin loader (always run)
  results.push(await testPluginLoader());

  // Summary
  const passed = results.filter(r => r).length;
  const total = results.length;

  log('\n════════════════════════════════════════════════════════', 'blue');
  log(`Results: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');

  if (passed === total) {
    log('\n✓ Integration is fully functional!', 'green');
  } else if (!workerHealthy) {
    log('\n⚠️  Start claude-mem worker to complete testing', 'yellow');
  } else {
    log('\n✗ Some tests failed - check errors above', 'red');
  }

  process.exit(passed === total ? 0 : 1);
}

runTests().catch(error => {
  log(`\nFatal error: ${error.message}`, 'red');
  process.exit(1);
});
