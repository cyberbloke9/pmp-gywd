/**
 * Command Validator
 *
 * Validates GYWD command markdown files for structure and content.
 * Zero external dependencies.
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse YAML frontmatter from markdown content
 * @param {string} content - Markdown content
 * @returns {object|null} Parsed frontmatter or null if not found
 */
function parseFrontmatter(content) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return null;
  }

  const frontmatter = {};
  const lines = frontmatterMatch[1].split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();

      // Handle arrays (lines starting with -)
      if (value === '') {
        const arrayLines = [];
        const startIndex = lines.indexOf(line);
        for (let i = startIndex + 1; i < lines.length; i++) {
          if (lines[i].trim().startsWith('-')) {
            arrayLines.push(lines[i].trim().slice(1).trim());
          } else if (lines[i].trim() && !lines[i].startsWith(' ')) {
            break;
          }
        }
        if (arrayLines.length > 0) {
          value = arrayLines;
        }
      }

      frontmatter[key] = value;
    }
  }

  return frontmatter;
}

/**
 * Required sections for a valid command file
 */
const REQUIRED_SECTIONS = ['objective'];
const PROCESS_SECTIONS = ['process', 'reference', 'output'];

/**
 * Validate a command file's structure
 * @param {string} content - File content
 * @param {string} fileName - File name for error messages
 * @returns {{valid: boolean, errors: string[], warnings: string[], frontmatter: object|null}}
 */
function validateCommandStructure(content, _fileName) {
  const errors = [];
  const warnings = [];

  // Check for frontmatter
  const frontmatter = parseFrontmatter(content);
  if (!frontmatter) {
    warnings.push('Missing YAML frontmatter');
  } else {
    // Validate frontmatter fields
    if (!frontmatter.name) {
      errors.push('Frontmatter missing required field: name');
    }
    if (!frontmatter.description) {
      errors.push('Frontmatter missing required field: description');
    }
  }

  // Check for required sections
  for (const section of REQUIRED_SECTIONS) {
    const regex = new RegExp(`<${section}[^>]*>`, 'i');
    if (!regex.test(content)) {
      errors.push(`Missing required section: <${section}>`);
    }
  }

  // Check for at least one process-type section
  const hasProcessSection = PROCESS_SECTIONS.some(section => {
    const regex = new RegExp(`<${section}[^>]*>`, 'i');
    return regex.test(content);
  });

  if (!hasProcessSection) {
    errors.push(`Missing <process>, <reference>, or <output> section`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    frontmatter,
  };
}

/**
 * Extract workflow references from command content
 * @param {string} content - File content
 * @returns {string[]} Array of referenced workflow paths
 */
function extractWorkflowReferences(content) {
  const references = [];
  const refMatches = content.matchAll(/@~\/.claude\/([^\s\n]+)/g);

  for (const match of refMatches) {
    // Strip trailing punctuation
    const refPath = match[1].replace(/[`.,)]+$/, '');
    if (refPath.includes('get-your-work-done/workflows/')) {
      references.push(path.basename(refPath));
    }
  }

  return references;
}

/**
 * Validate workflow references exist
 * @param {string[]} references - Array of workflow file names
 * @param {string} workflowsDir - Path to workflows directory
 * @returns {string[]} Array of missing workflow files
 */
function validateWorkflowReferences(references, workflowsDir) {
  const missing = [];

  for (const ref of references) {
    const workflowPath = path.join(workflowsDir, ref);
    if (!fs.existsSync(workflowPath)) {
      missing.push(ref);
    }
  }

  return missing;
}

/**
 * Validate a command file
 * @param {string} filePath - Path to the command file
 * @param {string} workflowsDir - Path to workflows directory
 * @returns {{valid: boolean, errors: string[], warnings: string[]}}
 */
function validateCommandFile(filePath, workflowsDir) {
  if (!fs.existsSync(filePath)) {
    return { valid: false, errors: [`File not found: ${filePath}`], warnings: [] };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);

  // Validate structure
  const structureResult = validateCommandStructure(content, fileName);

  // Validate workflow references
  const references = extractWorkflowReferences(content);
  const missingWorkflows = validateWorkflowReferences(references, workflowsDir);

  const errors = [...structureResult.errors];
  for (const missing of missingWorkflows) {
    errors.push(`Referenced workflow not found: ${missing}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: structureResult.warnings,
  };
}

module.exports = {
  parseFrontmatter,
  validateCommandStructure,
  extractWorkflowReferences,
  validateWorkflowReferences,
  validateCommandFile,
};
