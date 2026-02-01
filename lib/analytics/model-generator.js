'use strict';

/**
 * Model Generator Agent
 *
 * Generates code/models from schemas and specifications.
 * dbt-style analytics engineering pattern.
 * Part of Phase 31: Analytics Agents.
 */

const { BaseAgent, AGENT_PRIORITY } = require('../agents/base-agent');

/**
 * Model types
 */
const MODEL_TYPE = {
  STAGING: 'staging',
  INTERMEDIATE: 'intermediate',
  MART: 'mart',
  SNAPSHOT: 'snapshot',
  SEED: 'seed',
};

/**
 * Code generation templates
 */
const CODE_TEMPLATES = {
  javascript: {
    class: (name, fields) => `class ${name} {\n  constructor(data = {}) {\n${fields.map(f => `    this.${f.name} = data.${f.name} ?? ${f.default ?? 'null'};`).join('\n')}\n  }\n}`,
    function: (name, params, body) => `function ${name}(${params.join(', ')}) {\n  ${body}\n}`,
    module: (name, exports) => `'use strict';\n\n${exports.join('\n\n')}\n\nmodule.exports = { ${exports.map(e => e.split(' ')[1]?.split('(')[0] || '').filter(Boolean).join(', ')} };`,
  },
  sql: {
    select: (table, columns, where) => `SELECT\n  ${columns.join(',\n  ')}\nFROM ${table}${where ? `\nWHERE ${where}` : ''}`,
    create: (table, columns) => `CREATE TABLE ${table} (\n  ${columns.map(c => `${c.name} ${c.type}${c.nullable ? '' : ' NOT NULL'}`).join(',\n  ')}\n);`,
    staging: (source, columns) => `-- Staging model for ${source}\nWITH source AS (\n  SELECT * FROM {{ source('raw', '${source}') }}\n)\n\nSELECT\n  ${columns.join(',\n  ')}\nFROM source`,
  },
  typescript: {
    interface: (name, fields) => `interface ${name} {\n${fields.map(f => `  ${f.name}${f.optional ? '?' : ''}: ${f.type};`).join('\n')}\n}`,
    type: (name, definition) => `type ${name} = ${definition};`,
  },
};

/**
 * Model Generator Agent
 */
class ModelGeneratorAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      name: 'Model Generator',
      type: 'model_generator',
      priority: AGENT_PRIORITY.HIGH,
      ...options,
    });

    this.templates = { ...CODE_TEMPLATES, ...options.templates };
    this.namingConvention = options.namingConvention || 'camelCase';
  }

  async onExecute() {
    const { schema, language, modelType, options } = this.context;

    if (!schema) {
      return { success: false, error: 'No schema provided' };
    }

    const lang = language || 'javascript';
    const type = modelType || MODEL_TYPE.STAGING;

    try {
      const models = this._generateFromSchema(schema, lang, type, options || {});

      return {
        success: true,
        models,
        language: lang,
        modelType: type,
        stats: {
          modelsGenerated: models.length,
          totalLines: models.reduce((sum, m) => sum + m.code.split('\n').length, 0),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate models from schema
   * @param {object} schema
   * @param {string} language
   * @param {string} modelType
   * @param {object} options
   * @returns {Array}
   */
  _generateFromSchema(schema, language, modelType, options) {
    const models = [];

    // Handle different schema formats
    if (schema.tables) {
      // SQL schema with tables
      for (const table of schema.tables) {
        models.push(this._generateTableModel(table, language, modelType, options));
      }
    } else if (schema.entities) {
      // Entity schema
      for (const entity of schema.entities) {
        models.push(this._generateEntityModel(entity, language, options));
      }
    } else if (schema.fields || schema.properties) {
      // Single schema
      models.push(this._generateSingleModel(schema, language, options));
    }

    return models;
  }

  /**
   * Generate model for a database table
   * @param {object} table
   * @param {string} language
   * @param {string} modelType
   * @param {object} options
   * @returns {object}
   */
  _generateTableModel(table, language, modelType, options) {
    const name = this._formatName(table.name);
    const columns = table.columns || [];

    let code;
    let filePath;

    if (language === 'sql') {
      switch (modelType) {
        case MODEL_TYPE.STAGING:
          code = this.templates.sql.staging(
            table.name,
            columns.map(c => this._formatColumnRef(c))
          );
          filePath = `models/staging/stg_${table.name}.sql`;
          break;
        case MODEL_TYPE.MART:
          code = this._generateMartSQL(table, columns);
          filePath = `models/marts/${table.name}.sql`;
          break;
        default:
          code = this.templates.sql.select(
            table.name,
            columns.map(c => c.name)
          );
          filePath = `models/${table.name}.sql`;
      }
    } else {
      // JavaScript/TypeScript
      const fields = columns.map(c => ({
        name: this._formatName(c.name),
        type: this._mapSqlType(c.type, language),
        default: c.default,
        optional: c.nullable,
      }));

      if (language === 'typescript') {
        code = this.templates.typescript.interface(name, fields);
        filePath = `models/${name}.ts`;
      } else {
        code = this.templates.javascript.class(name, fields);
        filePath = `models/${name}.js`;
      }
    }

    return {
      name,
      type: modelType,
      language,
      code,
      filePath,
      sourceTable: table.name,
      columns: columns.length,
    };
  }

  /**
   * Generate model for an entity
   * @param {object} entity
   * @param {string} language
   * @param {object} options
   * @returns {object}
   */
  _generateEntityModel(entity, language, options) {
    const name = this._formatName(entity.name);
    const fields = (entity.fields || entity.properties || []).map(f => ({
      name: this._formatName(f.name),
      type: f.type || 'string',
      default: f.default,
      optional: f.optional || f.nullable,
    }));

    let code;
    let filePath;

    if (language === 'typescript') {
      code = this.templates.typescript.interface(name, fields);
      filePath = `models/${name}.ts`;
    } else {
      code = this.templates.javascript.class(name, fields);
      filePath = `models/${name}.js`;
    }

    return {
      name,
      type: 'entity',
      language,
      code,
      filePath,
      fieldCount: fields.length,
    };
  }

  /**
   * Generate model from single schema
   * @param {object} schema
   * @param {string} language
   * @param {object} options
   * @returns {object}
   */
  _generateSingleModel(schema, language, options) {
    const name = this._formatName(schema.name || 'Model');
    const fields = (schema.fields || schema.properties || []).map(f => ({
      name: this._formatName(typeof f === 'string' ? f : f.name),
      type: typeof f === 'string' ? 'any' : (f.type || 'any'),
      default: typeof f === 'object' ? f.default : null,
      optional: typeof f === 'object' ? f.optional : false,
    }));

    const code = language === 'typescript'
      ? this.templates.typescript.interface(name, fields)
      : this.templates.javascript.class(name, fields);

    return {
      name,
      type: 'single',
      language,
      code,
      filePath: `models/${name}.${language === 'typescript' ? 'ts' : 'js'}`,
      fieldCount: fields.length,
    };
  }

  /**
   * Generate mart SQL model
   * @param {object} table
   * @param {Array} columns
   * @returns {string}
   */
  _generateMartSQL(table, columns) {
    const lines = [
      `-- Mart model for ${table.name}`,
      `-- Generated by GYWD Model Generator`,
      '',
      'WITH staging AS (',
      `  SELECT * FROM {{ ref('stg_${table.name}') }}`,
      ')',
      '',
      'SELECT',
      ...columns.map((c, i) => `  ${c.name}${i < columns.length - 1 ? ',' : ''}`),
      'FROM staging',
    ];

    return lines.join('\n');
  }

  /**
   * Format column reference
   * @param {object} column
   * @returns {string}
   */
  _formatColumnRef(column) {
    const cast = this._needsCast(column.type);
    if (cast) {
      return `CAST(${column.name} AS ${cast}) AS ${column.name}`;
    }
    return column.name;
  }

  /**
   * Check if type needs casting
   * @param {string} type
   * @returns {string|null}
   */
  _needsCast(type) {
    const typeLower = (type || '').toLowerCase();
    if (typeLower.includes('timestamp')) return 'TIMESTAMP';
    if (typeLower.includes('date')) return 'DATE';
    if (typeLower.includes('numeric')) return 'NUMERIC';
    return null;
  }

  /**
   * Map SQL type to language type
   * @param {string} sqlType
   * @param {string} language
   * @returns {string}
   */
  _mapSqlType(sqlType, language) {
    const typeLower = (sqlType || '').toLowerCase();

    const typeMap = {
      javascript: {
        int: 'number',
        integer: 'number',
        bigint: 'number',
        float: 'number',
        double: 'number',
        decimal: 'number',
        numeric: 'number',
        varchar: 'string',
        char: 'string',
        text: 'string',
        boolean: 'boolean',
        bool: 'boolean',
        date: 'Date',
        timestamp: 'Date',
        datetime: 'Date',
        json: 'object',
        jsonb: 'object',
      },
      typescript: {
        int: 'number',
        integer: 'number',
        bigint: 'bigint',
        float: 'number',
        double: 'number',
        decimal: 'number',
        numeric: 'number',
        varchar: 'string',
        char: 'string',
        text: 'string',
        boolean: 'boolean',
        bool: 'boolean',
        date: 'Date',
        timestamp: 'Date',
        datetime: 'Date',
        json: 'Record<string, unknown>',
        jsonb: 'Record<string, unknown>',
      },
    };

    const map = typeMap[language] || typeMap.javascript;

    for (const [key, value] of Object.entries(map)) {
      if (typeLower.includes(key)) {
        return value;
      }
    }

    return language === 'typescript' ? 'unknown' : 'any';
  }

  /**
   * Format name according to naming convention
   * @param {string} name
   * @returns {string}
   */
  _formatName(name) {
    const cleaned = name.replace(/[^a-zA-Z0-9_]/g, '_');

    switch (this.namingConvention) {
      case 'camelCase':
        return cleaned.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      case 'PascalCase':
        return cleaned.replace(/(^|_)([a-z])/g, (_, __, c) => c.toUpperCase());
      case 'snake_case':
        return cleaned.toLowerCase();
      default:
        return cleaned;
    }
  }
}

module.exports = {
  ModelGeneratorAgent,
  MODEL_TYPE,
  CODE_TEMPLATES,
};
