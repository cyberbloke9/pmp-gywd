#!/usr/bin/env node

/**
 * GYWD MCP Server
 *
 * Model Context Protocol server exposing GYWD capabilities.
 * Provides tools and resources for Claude integration.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const PLANNING_DIR = process.env.GYWD_PLANNING_DIR || '.planning';

/**
 * Read a file from the planning directory
 */
function readPlanningFile(filename) {
  const filePath = path.join(process.cwd(), PLANNING_DIR, filename);
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse STATE.md to extract current state
 */
function parseState() {
  const content = readPlanningFile('STATE.md');
  if (!content) return null;

  const state = {};

  const phaseMatch = content.match(/\*\*Phase:\*\*\s*(\d+)\s*of\s*(\d+)/);
  if (phaseMatch) {
    state.phase = { current: parseInt(phaseMatch[1]), total: parseInt(phaseMatch[2]) };
  }

  const planMatch = content.match(/\*\*Plan:\*\*\s*(\d+)\s*of\s*(\d+)/);
  if (planMatch) {
    state.plan = { current: parseInt(planMatch[1]), total: parseInt(planMatch[2]) };
  }

  const focusMatch = content.match(/\*\*Focus:\*\*\s*(.+)/);
  if (focusMatch) {
    state.focus = focusMatch[1].trim();
  }

  const milestoneMatch = content.match(/\*\*Current milestone:\*\*\s*(.+)/);
  if (milestoneMatch) {
    state.milestone = milestoneMatch[1].trim();
  }

  return state;
}

/**
 * Search for files matching a pattern
 */
function searchFiles(pattern, directory = '.') {
  const results = [];
  const regex = new RegExp(pattern, 'i');

  function walk(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip common exclusions
        if (['node_modules', '.git', 'dist', 'build', 'coverage'].includes(entry.name)) {
          continue;
        }

        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (regex.test(entry.name)) {
          results.push(fullPath);
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  walk(directory);
  return results.slice(0, 50); // Limit results
}

// Create server
const server = new Server(
  {
    name: 'gywd-mcp-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_status',
        description: 'Get current GYWD project status including phase, plan, and focus',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_roadmap',
        description: 'Get the project roadmap with all phases and progress',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_context',
        description: 'Get current project context including STATE, PROJECT, and recent activity',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'search_files',
        description: 'Search for files matching a pattern in the project',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: {
              type: 'string',
              description: 'File name pattern to search for (regex)',
            },
          },
          required: ['pattern'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'get_status': {
      const state = parseState();
      if (!state) {
        return {
          content: [
            {
              type: 'text',
              text: 'No GYWD project found. Initialize with /gywd:init',
            },
          ],
        };
      }

      const lines = [];
      if (state.milestone) lines.push(`Milestone: ${state.milestone}`);
      if (state.phase) lines.push(`Phase: ${state.phase.current} of ${state.phase.total}`);
      if (state.focus) lines.push(`Focus: ${state.focus}`);
      if (state.plan) lines.push(`Plan: ${state.plan.current} of ${state.plan.total}`);

      return {
        content: [
          {
            type: 'text',
            text: lines.join('\n'),
          },
        ],
      };
    }

    case 'get_roadmap': {
      const content = readPlanningFile('ROADMAP.md');
      return {
        content: [
          {
            type: 'text',
            text: content || 'ROADMAP.md not found',
          },
        ],
      };
    }

    case 'get_context': {
      const state = readPlanningFile('STATE.md');
      const project = readPlanningFile('PROJECT.md');

      const parts = [];
      if (state) parts.push('# STATE\n' + state);
      if (project) parts.push('# PROJECT\n' + project);

      return {
        content: [
          {
            type: 'text',
            text: parts.length > 0 ? parts.join('\n\n---\n\n') : 'No context files found',
          },
        ],
      };
    }

    case 'search_files': {
      const pattern = args?.pattern || '';
      const files = searchFiles(pattern);

      return {
        content: [
          {
            type: 'text',
            text: files.length > 0
              ? `Found ${files.length} files:\n${files.join('\n')}`
              : 'No files found matching pattern',
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const resources = [];

  const files = ['STATE.md', 'ROADMAP.md', 'PROJECT.md', 'ISSUES.md'];
  for (const file of files) {
    const content = readPlanningFile(file);
    if (content) {
      resources.push({
        uri: `gywd://${file}`,
        name: file,
        description: `GYWD ${file.replace('.md', '')} file`,
        mimeType: 'text/markdown',
      });
    }
  }

  return { resources };
});

// Read resource content
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  const filename = uri.replace('gywd://', '');
  const content = readPlanningFile(filename);

  if (!content) {
    throw new Error(`Resource not found: ${uri}`);
  }

  return {
    contents: [
      {
        uri,
        mimeType: 'text/markdown',
        text: content,
      },
    ],
  };
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GYWD MCP server running');
}

main().catch(console.error);
