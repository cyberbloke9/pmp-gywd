'use strict';

/**
 * Performance Test Helpers
 *
 * Utilities for performance testing.
 */

/**
 * Measure execution time of an async function
 * @param {Function} fn - Function to measure
 * @returns {Promise<{result: any, durationMs: number}>}
 */
async function measureAsync(fn) {
  const start = Date.now();
  const result = await fn();
  return {
    result,
    durationMs: Date.now() - start,
  };
}

/**
 * Measure execution time of a sync function
 * @param {Function} fn - Function to measure
 * @returns {{result: any, durationMs: number}}
 */
function measureSync(fn) {
  const start = Date.now();
  const result = fn();
  return {
    result,
    durationMs: Date.now() - start,
  };
}

/**
 * Wait for a specified duration
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Run a function multiple times and return timing statistics
 * @param {Function} fn - Function to benchmark
 * @param {number} iterations - Number of iterations
 * @returns {{min: number, max: number, avg: number, total: number, iterations: number}}
 */
function benchmark(fn, iterations = 100) {
  const times = [];

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    fn();
    times.push(Date.now() - start);
  }

  const total = times.reduce((a, b) => a + b, 0);

  return {
    min: Math.min(...times),
    max: Math.max(...times),
    avg: total / iterations,
    total,
    iterations,
  };
}

module.exports = {
  measureAsync,
  measureSync,
  wait,
  benchmark,
};
