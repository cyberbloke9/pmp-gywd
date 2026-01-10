#!/usr/bin/env node
/**
 * Schema Validation Script
 *
 * Validates all JSON files in .planning/core/ against their schemas
 * and validates schema files themselves for structural correctness.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
};

// Schema directories
const SCHEMA_DIR = path.join(__dirname, '..', 'get-your-work-done', 'core');
const PLANNING_CORE_DIR = path.join(__dirname, '..', '.planning', 'core');

// Schema files to validate
const SCHEMA_FILES = [
  'decisions-schema.json',
  'context-model-schema.json',
  'learning-state-schema.json',
  'profile-schema.json',
];

// Data files and their schemas
const DATA_SCHEMA_MAPPING = {
  'decisions.json': 'decisions-schema.json',
  'context-model.json': 'context-model-schema.json',
  'learning-state.json': 'learning-state-schema.json',
};

let errors = 0;
let warnings = 0;

/**
 * Validate JSON syntax
 */
function validateJsonSyntax(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    JSON.parse(content);
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Validate schema structure (basic validation without external deps)
 */
function validateSchemaStructure(schema, _schemaName) {
  const issues = [];

  // Check for required schema metadata
  if (!schema.$schema) {
    issues.push('Missing $schema declaration');
  }

  if (!schema.title) {
    issues.push('Missing title');
  }

  if (!schema.type && !schema.properties && !schema.definitions) {
    issues.push('Schema has no type, properties, or definitions');
  }

  // Validate definitions if present
  if (schema.definitions) {
    for (const [defName, def] of Object.entries(schema.definitions)) {
      if (!def.type && !def.properties && !def.$ref) {
        issues.push(`Definition '${defName}' has no type, properties, or $ref`);
      }
    }
  }

  // Check for required fields in properties
  if (schema.properties && schema.required) {
    for (const requiredField of schema.required) {
      if (!schema.properties[requiredField]) {
        issues.push(`Required field '${requiredField}' not defined in properties`);
      }
    }
  }

  return issues;
}

/**
 * Basic data validation against schema (without external validator)
 */
function validateDataAgainstSchema(data, schema) {
  const issues = [];

  // Check required fields
  if (schema.required && Array.isArray(schema.required)) {
    for (const field of schema.required) {
      if (!(field in data)) {
        issues.push(`Missing required field: ${field}`);
      }
    }
  }

  // Check type of root
  if (schema.type === 'object' && typeof data !== 'object') {
    issues.push(`Expected object, got ${typeof data}`);
  }

  if (schema.type === 'array' && !Array.isArray(data)) {
    issues.push(`Expected array, got ${typeof data}`);
  }

  // Check version field if present in schema
  if (schema.properties?.version?.const && data.version !== schema.properties.version.const) {
    issues.push(`Version mismatch: expected ${schema.properties.version.const}, got ${data.version}`);
  }

  return issues;
}

/**
 * Main validation
 */
function main() {
  console.log('\n📋 Validating JSON Schemas\n');

  // Validate schema files themselves
  log.info('Validating schema files...');

  for (const schemaFile of SCHEMA_FILES) {
    const schemaPath = path.join(SCHEMA_DIR, schemaFile);

    if (!fs.existsSync(schemaPath)) {
      log.warn(`Schema file not found: ${schemaFile}`);
      warnings++;
      continue;
    }

    // Validate JSON syntax
    const syntaxResult = validateJsonSyntax(schemaPath);
    if (!syntaxResult.valid) {
      log.error(`${schemaFile}: Invalid JSON syntax - ${syntaxResult.error}`);
      errors++;
      continue;
    }

    // Validate structure
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    const structureIssues = validateSchemaStructure(schema, schemaFile);

    if (structureIssues.length > 0) {
      log.error(`${schemaFile}: ${structureIssues.join(', ')}`);
      errors++;
    } else {
      log.success(`${schemaFile}`);
    }
  }

  // Validate data files against schemas
  console.log('\n');
  log.info('Validating data files against schemas...');

  if (fs.existsSync(PLANNING_CORE_DIR)) {
    for (const [dataFile, schemaFile] of Object.entries(DATA_SCHEMA_MAPPING)) {
      const dataPath = path.join(PLANNING_CORE_DIR, dataFile);
      const schemaPath = path.join(SCHEMA_DIR, schemaFile);

      if (!fs.existsSync(dataPath)) {
        log.warn(`Data file not found: ${dataFile} (not initialized yet)`);
        warnings++;
        continue;
      }

      if (!fs.existsSync(schemaPath)) {
        log.warn(`Schema not found for: ${dataFile}`);
        warnings++;
        continue;
      }

      // Validate JSON syntax
      const syntaxResult = validateJsonSyntax(dataPath);
      if (!syntaxResult.valid) {
        log.error(`${dataFile}: Invalid JSON - ${syntaxResult.error}`);
        errors++;
        continue;
      }

      // Validate against schema
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
      const validationIssues = validateDataAgainstSchema(data, schema);

      if (validationIssues.length > 0) {
        log.error(`${dataFile}: ${validationIssues.join(', ')}`);
        errors++;
      } else {
        log.success(`${dataFile} validates against ${schemaFile}`);
      }
    }
  } else {
    log.warn('.planning/core/ directory not found (project not bootstrapped)');
    warnings++;
  }

  // Summary
  console.log(`\n${ '─'.repeat(50)}`);
  if (errors > 0) {
    log.error(`Validation failed: ${errors} error(s), ${warnings} warning(s)`);
    process.exit(1);
  } else if (warnings > 0) {
    log.warn(`Validation passed with ${warnings} warning(s)`);
    process.exit(0);
  } else {
    log.success('All validations passed!');
    process.exit(0);
  }
}

main();
