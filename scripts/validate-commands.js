#!/usr/bin/env node
/**
 * Command Validation Script
 *
 * Validates all GYWD command files for:
 * - YAML frontmatter structure
 * - Required sections (objective, process)
 * - Cross-references to workflows/templates
 * - Plugin.json registration
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

// Directories
const COMMANDS_DIR = path.join(__dirname, '..', 'commands', 'gywd');
const PLUGIN_PATH = path.join(__dirname, '..', '.claude-plugin', 'plugin.json');
const WORKFLOWS_DIR = path.join(__dirname, '..', 'get-your-work-done', 'workflows');
const _TEMPLATES_DIR = path.join(__dirname, '..', 'get-your-work-done', 'templates');

let errors = 0;
let warnings = 0;

/**
 * Parse YAML frontmatter (basic parser without external deps)
 */
function parseFrontmatter(content) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return null;
  }

  const frontmatter = {};
  const lines = frontmatterMatch[1].split('\n');

  let currentKey = null;
  let isArray = false;

  for (const line of lines) {
    // Array item
    if (line.match(/^\s+-\s+/)) {
      if (currentKey && isArray) {
        const value = line.replace(/^\s+-\s+/, '').trim();
        frontmatter[currentKey].push(value);
      }
      continue;
    }

    // Key-value pair
    const kvMatch = line.match(/^(\w[\w-]*):\s*(.*)?$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      const value = kvMatch[2]?.trim();

      if (value === '' || value === undefined) {
        // Might be an array
        frontmatter[currentKey] = [];
        isArray = true;
      } else {
        frontmatter[currentKey] = value;
        isArray = false;
      }
    }
  }

  return frontmatter;
}

/**
 * Validate command file structure
 */
function validateCommand(filePath, _fileName) {
  const issues = [];
  const content = fs.readFileSync(filePath, 'utf8');

  // Check frontmatter exists
  const frontmatter = parseFrontmatter(content);
  if (!frontmatter) {
    issues.push('Missing YAML frontmatter');
    return issues;
  }

  // Check required frontmatter fields
  if (!frontmatter.name) {
    issues.push('Missing "name" in frontmatter');
  } else if (!frontmatter.name.startsWith('GYWD:')) {
    issues.push(`Name should start with "GYWD:", got "${frontmatter.name}"`);
  }

  if (!frontmatter.description) {
    issues.push('Missing "description" in frontmatter');
  }

  // Check for required sections
  if (!content.includes('<objective>')) {
    issues.push('Missing <objective> section');
  }

  // Check for process or specific content
  const hasProcess = content.includes('<process>');
  const hasReference = content.includes('<reference>');
  const hasOutput = content.includes('<output');

  if (!hasProcess && !hasReference && !hasOutput) {
    issues.push('Missing <process>, <reference>, or <output> section');
  }

  // Check for @references that might not exist
  const refMatches = content.matchAll(/@~\/.claude\/([^\s\n]+)/g);
  for (const match of refMatches) {
    const refPath = match[1];
    // Just log as info, don't fail - paths may be user-specific
    if (refPath.includes('get-your-work-done/workflows/')) {
      const workflowName = path.basename(refPath);
      const workflowPath = path.join(WORKFLOWS_DIR, workflowName);
      if (!fs.existsSync(workflowPath)) {
        issues.push(`Referenced workflow not found: ${workflowName}`);
      }
    }
  }

  return issues;
}

/**
 * Validate plugin.json registration
 */
function validatePluginRegistration(commandFiles) {
  const issues = [];

  if (!fs.existsSync(PLUGIN_PATH)) {
    issues.push('plugin.json not found');
    return issues;
  }

  const plugin = JSON.parse(fs.readFileSync(PLUGIN_PATH, 'utf8'));

  if (!plugin.commands || !Array.isArray(plugin.commands)) {
    issues.push('plugin.json missing commands array');
    return issues;
  }

  // Check each command file is registered
  const registeredCommands = new Set(
    plugin.commands.map(cmd => path.basename(cmd)),
  );

  for (const cmdFile of commandFiles) {
    if (!registeredCommands.has(cmdFile)) {
      issues.push(`Command not registered in plugin.json: ${cmdFile}`);
    }
  }

  // Check for ghost entries (registered but don't exist)
  for (const cmdPath of plugin.commands) {
    const cmdName = path.basename(cmdPath);
    const fullPath = path.join(COMMANDS_DIR, cmdName);
    if (!fs.existsSync(fullPath)) {
      issues.push(`Ghost entry in plugin.json (file missing): ${cmdName}`);
    }
  }

  return issues;
}

/**
 * Main validation
 */
function main() {
  console.log('\n📋 Validating GYWD Commands\n');

  // Get all command files
  if (!fs.existsSync(COMMANDS_DIR)) {
    log.error(`Commands directory not found: ${COMMANDS_DIR}`);
    process.exit(1);
  }

  const commandFiles = fs.readdirSync(COMMANDS_DIR)
    .filter(f => f.endsWith('.md'));

  log.info(`Found ${commandFiles.length} command files\n`);

  // Validate each command
  let _commandsWithFrontmatter = 0;
  let commandsWithoutFrontmatter = 0;

  for (const cmdFile of commandFiles) {
    const cmdPath = path.join(COMMANDS_DIR, cmdFile);
    const issues = validateCommand(cmdPath, cmdFile);

    if (issues.length > 0) {
      // Treat missing frontmatter as warning (v2.0 backward compatibility)
      if (issues.length === 1 && issues[0] === 'Missing YAML frontmatter') {
        commandsWithoutFrontmatter++;
      } else {
        log.error(`${cmdFile}:`);
        for (const issue of issues) {
          console.log(`   - ${issue}`);
        }
        errors++;
      }
    } else {
      log.success(cmdFile);
      _commandsWithFrontmatter++;
    }
  }

  if (commandsWithoutFrontmatter > 0) {
    log.warn(`${commandsWithoutFrontmatter} command(s) missing YAML frontmatter (v2.0 legacy)`);
    warnings = commandsWithoutFrontmatter;
  }

  // Validate plugin.json registration
  console.log('\n');
  log.info('Validating plugin.json registration...');

  const registrationIssues = validatePluginRegistration(commandFiles);
  if (registrationIssues.length > 0) {
    for (const issue of registrationIssues) {
      log.error(issue);
    }
    errors += registrationIssues.length;
  } else {
    log.success('All commands properly registered');
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
    log.success(`All ${commandFiles.length} commands validated!`);
    process.exit(0);
  }
}

main();
