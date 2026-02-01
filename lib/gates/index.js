'use strict';

/**
 * GYWD Gates
 *
 * Quality gates for PRs and releases.
 */

const { PRGate, GATE_STATUS } = require('./pr-gate');

module.exports = {
  PRGate,
  GATE_STATUS,
};
