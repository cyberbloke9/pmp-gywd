'use strict';

/**
 * GYWD Analytics Agents
 *
 * dbt-style analytics engineering agents for code generation, testing, and review.
 */

const { ModelGeneratorAgent, MODEL_TYPE, CODE_TEMPLATES } = require('./model-generator');
const { TestGeneratorAgent, TEST_TYPE, DATA_QUALITY_TESTS } = require('./test-generator');
const { ReviewAgent, REVIEW_CATEGORY, REVIEW_SEVERITY } = require('./review-agent');

module.exports = {
  // Model Generator
  ModelGeneratorAgent,
  MODEL_TYPE,
  CODE_TEMPLATES,

  // Test Generator
  TestGeneratorAgent,
  TEST_TYPE,
  DATA_QUALITY_TESTS,

  // Review Agent
  ReviewAgent,
  REVIEW_CATEGORY,
  REVIEW_SEVERITY,
};
