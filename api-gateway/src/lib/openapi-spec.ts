export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'GYWD API Gateway',
    version: '0.1.0',
    description: 'REST API for GYWD project intelligence. Provides access to project status, patterns, memory, and planning data.',
  },
  servers: [
    { url: 'http://localhost:3945', description: 'Local development' },
  ],
  security: [{ apiKey: [] }],
  components: {
    securitySchemes: {
      apiKey: {
        type: 'apiKey' as const,
        in: 'header' as const,
        name: 'X-API-Key',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string' },
        },
      },
      Status: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              state: {
                type: 'object',
                properties: {
                  phase: { type: 'object', properties: { current: { type: 'integer' }, total: { type: 'integer' } } },
                  focus: { type: 'string' },
                  milestone: { type: 'string' },
                  status: { type: 'string' },
                  progress: { type: 'integer' },
                },
              },
              stats: {
                type: 'object',
                properties: {
                  totalPatterns: { type: 'integer' },
                  expertiseAreas: { type: 'integer' },
                  projectsCount: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        security: [],
        responses: { '200': { description: 'Server is healthy' } },
      },
    },
    '/api/v1/status': {
      get: {
        summary: 'Get project status',
        tags: ['Status'],
        responses: {
          '200': { description: 'Project status with stats' },
          '401': { description: 'Missing API key' },
          '403': { description: 'Invalid API key' },
        },
      },
    },
    '/api/v1/memory': {
      get: {
        summary: 'Get memory data',
        tags: ['Memory'],
        parameters: [
          { name: 'section', in: 'query', schema: { type: 'string', enum: ['all', 'patterns', 'expertise', 'preferences', 'projects'] } },
        ],
        responses: { '200': { description: 'Memory data' } },
      },
    },
    '/api/v1/patterns': {
      get: {
        summary: 'Get classified patterns',
        tags: ['Patterns'],
        responses: { '200': { description: 'Classified patterns' } },
      },
    },
    '/api/v1/planning': {
      get: {
        summary: 'Get planning data',
        tags: ['Planning'],
        parameters: [
          { name: 'file', in: 'query', schema: { type: 'string', enum: ['state', 'roadmap', 'parsed'] } },
        ],
        responses: { '200': { description: 'Planning data' } },
      },
    },
    '/api/v1/keys': {
      get: { summary: 'List API keys (masked)', tags: ['Keys'], responses: { '200': { description: 'API key list' } } },
      post: {
        summary: 'Generate API key',
        tags: ['Keys'],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } } } },
        responses: { '201': { description: 'New API key' } },
      },
      delete: {
        summary: 'Revoke API key',
        tags: ['Keys'],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { key: { type: 'string' } }, required: ['key'] } } } },
        responses: { '200': { description: 'Key revoked' } },
      },
    },
  },
};
