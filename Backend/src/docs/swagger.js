/**
 * Swagger/OpenAPI Configuration
 * Generates OpenAPI 3.0 specification from JSDoc annotations
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

/**
 * OpenAPI 3.0 Specification Configuration
 * @type {import('swagger-jsdoc').Options}
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Notes API',
      version: '1.0.0',
      description: 'A RESTful API for managing notes with full CRUD operations, pagination, and health checks',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
        url: 'https://example.com/support'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.example.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using the Bearer scheme. Example: "Authorization: Bearer {token}"'
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API Key authentication'
        }
      },
      schemas: {
        Note: {
          type: 'object',
          required: ['id', 'title', 'content', 'createdAt', 'updatedAt'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Unique identifier for the note',
              example: '550e8400-e29b-41d4-a716-446655440000'
            },
            title: {
              type: 'string',
              minLength: 1,
              maxLength: 200,
              description: 'Title of the note',
              example: 'Meeting Notes'
            },
            content: {
              type: 'string',
              description: 'Content/body of the note',
              example: 'Discussed project timeline and deliverables...'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string',
                minLength: 1,
                maxLength: 50
              },
              description: 'Tags associated with the note',
              example: ['meeting', 'project', 'important']
            },
            isPinned: {
              type: 'boolean',
              default: false,
              description: 'Whether the note is pinned',
              example: false
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the note was created',
              example: '2024-01-15T10:30:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the note was last updated',
              example: '2024-01-15T10:30:00.000Z'
            }
          }
        },
        NoteInput: {
          type: 'object',
          required: ['title', 'content'],
          properties: {
            title: {
              type: 'string',
              minLength: 1,
              maxLength: 200,
              description: 'Title of the note',
              example: 'Meeting Notes'
            },
            content: {
              type: 'string',
              minLength: 1,
              description: 'Content/body of the note',
              example: 'Discussed project timeline and deliverables...'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string',
                minLength: 1,
                maxLength: 50
              },
              description: 'Tags associated with the note',
              example: ['meeting', 'project']
            },
            isPinned: {
              type: 'boolean',
              default: false,
              description: 'Whether the note should be pinned',
              example: false
            }
          }
        },
        NoteUpdate: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              minLength: 1,
              maxLength: 200,
              description: 'Title of the note',
              example: 'Updated Meeting Notes'
            },
            content: {
              type: 'string',
              minLength: 1,
              description: 'Content/body of the note',
              example: 'Updated discussion points...'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string',
                minLength: 1,
                maxLength: 50
              },
              description: 'Tags associated with the note',
              example: ['meeting', 'project', 'updated']
            },
            isPinned: {
              type: 'boolean',
              description: 'Whether the note should be pinned',
              example: true
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          required: ['success', 'error'],
          properties: {
            success: {
              type: 'boolean',
              enum: [false],
              description: 'Indicates if the request was successful',
              example: false
            },
            error: {
              type: 'object',
              required: ['code', 'message'],
              properties: {
                code: {
                  type: 'string',
                  description: 'Error code for programmatic handling',
                  example: 'VALIDATION_ERROR'
                },
                message: {
                  type: 'string',
                  description: 'Human-readable error message',
                  example: 'Title is required and must be between 1 and 200 characters'
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: {
                        type: 'string',
                        example: 'title'
                      },
                      message: {
                        type: 'string',
                        example: 'Title is required'
                      }
                    }
                  },
                  description: 'Detailed validation errors'
                }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the error occurred',
              example: '2024-01-15T10:30:00.000Z'
            },
            path: {
              type: 'string',
              description: 'Request path that generated the error',
              example: '/api/notes'
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          required: ['success', 'data'],
          properties: {
            success: {
              type: 'boolean',
              enum: [true],
              description: 'Indicates if the request was successful',
              example: true
            },
            data: {
              type: 'object',
              description: 'Response data payload'
            },
            message: {
              type: 'string',
              description: 'Optional success message',
              example: 'Note created successfully'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp when the response was generated',
              example: '2024-01-15T10:30:00.000Z'
            }
          }
        },
        PaginatedResponse: {
          type: 'object',
          required: ['success', 'data', 'pagination'],
          properties: {
            success: {
              type: 'boolean',
              enum: [true],
              example: true
            },
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Note'
              },
              description: 'Array of notes for the current page'
            },
            pagination: {
              type: 'object',
              required: ['page', 'limit', 'total', 'totalPages', 'hasNext', 'hasPrev'],
              properties: {
                page: {
                  type: 'integer',
                  minimum: 1,
                  description: 'Current page number',
                  example: 1
                },
                limit: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 100,
                  description: 'Number of items per page',
                  example: 10
                },
                total: {
                  type: 'integer',
                  minimum: 0,
                  description: 'Total number of items',
                  example: 42
                },
                totalPages: {
                  type: 'integer',
                  minimum: 0,
                  description: 'Total number of pages',
                  example: 5
                },
                hasNext: {
                  type: 'boolean',
                  description: 'Whether there is a next page',
                  example: true
                },
                hasPrev: {
                  type: 'boolean',
                  description: 'Whether there is a previous page',
                  example: false
                }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z'
            }
          }
        },
        HealthCheck: {
          type: 'object',
          required: ['status', 'timestamp', 'uptime', 'environment', 'version'],
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'degraded', 'unhealthy'],
              description: 'Overall health status',
              example: 'healthy'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Timestamp of the health check',
              example: '2024-01-15T10:30:00.000Z'
            },
            uptime: {
              type: 'number',
              description: 'Application uptime in seconds',
              example: 3600.5
            },
            environment: {
              type: 'string',
              enum: ['development', 'staging', 'production'],
              description: 'Current environment',
              example: 'development'
            },
            version: {
              type: 'string',
              description: 'Application version',
              example: '1.0.0'
            },
            checks: {
              type: 'object',
              description: 'Individual health check results',
              additionalProperties: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['pass', 'warn', 'fail']
                  },
                  component: {
                    type: 'string'
                  },
                  observedValue: {
                    type: 'string'
                  },
                  observedUnit: {
                    type: 'string'
                  },
                  threshold: {
                    type: 'string'
                  }
                }
              }
            }
          }
        },
        ReadinessCheck: {
          type: 'object',
          required: ['ready', 'timestamp', 'checks'],
          properties: {
            ready: {
              type: 'boolean',
              description: 'Whether the service is ready to accept traffic',
              example: true
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z'
            },
            checks: {
              type: 'object',
              required: ['database', 'cache'],
              properties: {
                database: {
                  type: 'object',
                  required: ['status', 'latency'],
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['pass', 'fail']
                    },
                    latency: {
                      type: 'number',
                      description: 'Database response time in milliseconds'
                    }
                  }
                },
                cache: {
                  type: 'object',
                  required: ['status', 'latency'],
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['pass', 'fail']
                    },
                    latency: {
                      type: 'number',
                      description: 'Cache response time in milliseconds'
                    }
                  }
                }
              }
            }
          }
        },
        LivenessCheck: {
          type: 'object',
          required: ['alive', 'timestamp', 'uptime'],
          properties: {
            alive: {
              type: 'boolean',
              description: 'Whether the service is alive',
              example: true
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z'
            },
            uptime: {
              type: 'number',
              description: 'Application uptime in seconds',
              example: 3600.5
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Unauthorized - Invalid or missing authentication',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: {
                  code: 'UNAUTHORIZED',
                  message: 'Authentication required'
                },
                timestamp: '2024-01-15T10:30:00.000Z',
                path: '/api/notes'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Forbidden - Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: {
                  code: 'FORBIDDEN',
                  message: 'Insufficient permissions to access this resource'
                },
                timestamp: '2024-01-15T10:30:00.000Z',
                path: '/api/notes/123'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Not Found - Resource does not exist',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: {
                  code: 'NOT_FOUND',
                  message: 'Note not found'
                },
                timestamp: '2024-01-15T10:30:00.000Z',
                path: '/api/notes/550e8400-e29b-41d4-a716-446655440000'
              }
            }
          }
        },
        ValidationError: {
          description: 'Bad Request - Validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: {
                  code: 'VALIDATION_ERROR',
                  message: 'Validation failed',
                  details: [
                    {
                      field: 'title',
                      message: 'Title is required'
                    }
                  ]
                },
                timestamp: '2024-01-15T10:30:00.000Z',
                path: '/api/notes'
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: {
                  code: 'INTERNAL_ERROR',
                  message: 'An unexpected error occurred'
                },
                timestamp: '2024-01-15T10:30:00.000Z',
                path: '/api/notes'
              }
            }
          }
        },
        TooManyRequestsError: {
          description: 'Too Many Requests - Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: {
                  code: 'RATE_LIMIT_EXCEEDED',
                  message: 'Too many requests, please try again later'
                },
                timestamp: '2024-01-15T10:30:00.000Z',
                path: '/api/notes'
              }
            }
          }
        }
      },
      parameters: {
        noteId: {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Unique identifier of the note (UUID)',
          schema: {
            type: 'string',
            format: 'uuid'
          },
          example: '550e8400-e29b-41d4-a716-446655440000'
        },
        page: {
          name: 'page',
          in: 'query',
          description: 'Page number for pagination',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1
          },
          example: 1
        },
        limit: {
          name: 'limit',
          in: 'query',
          description: 'Number of items per page',
          schema