/**
 * GYWD Validators
 *
 * Central export for all validation modules.
 * Zero external dependencies.
 */

const schemaValidator = require('./schema-validator');
const commandValidator = require('./command-validator');

module.exports = {
  // Schema validation
  validateJsonSyntax: schemaValidator.validateJsonSyntax,
  validateSchemaStructure: schemaValidator.validateSchemaStructure,
  validateDataAgainstSchema: schemaValidator.validateDataAgainstSchema,
  loadSchema: schemaValidator.loadSchema,
  validateFile: schemaValidator.validateFile,

  // Command validation
  parseFrontmatter: commandValidator.parseFrontmatter,
  validateCommandStructure: commandValidator.validateCommandStructure,
  extractWorkflowReferences: commandValidator.extractWorkflowReferences,
  validateWorkflowReferences: commandValidator.validateWorkflowReferences,
  validateCommandFile: commandValidator.validateCommandFile,

  // Namespaced exports
  schema: schemaValidator,
  command: commandValidator,
};
