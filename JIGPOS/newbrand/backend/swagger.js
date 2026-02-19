/**
 * Swagger API Documentation Configuration
 * OpenAPI 3.0 specification for JIG Craft Cannabis REST API
 */

const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./config');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'JIG Craft Cannabis API',
      version: '1.0.0',
      description: 'Cannabis Cultivation & Wellness E-commerce Platform REST API',
      contact: {
        name: 'JIG Craft Cannabis',
        email: 'hello@jig.cleva-ai.co.za',
        url: 'https://jig.cleva-ai.co.za'
      },
      license: {
        name: 'Proprietary',
        url: 'https://jig.cleva-ai.co.za/license'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server'
      },
      {
        url: 'https://jig.cleva-ai.co.za',
        description: 'Production server'
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication endpoints (login, register, password reset)'
      },
      {
        name: 'Products',
        description: 'Product catalog management (cannabis accessories, CBD products)'
      },
      {
        name: 'Orders',
        description: 'E-commerce order processing and tracking'
      },
      {
        name: 'Cart',
        description: 'Shopping cart operations'
      },
      {
        name: 'Menu',
        description: 'Coffee shop menu (Thaba Café & Morija Roastery)'
      },
      {
        name: 'Affiliates',
        description: 'Wellness advocate affiliate program'
      },
      {
        name: 'Section 21',
        description: 'Medical cannabis products (requires authentication)'
      },
      {
        name: 'Dashboard',
        description: 'User dashboard and analytics'
      },
      {
        name: 'Staff',
        description: 'Staff management (admin only)'
      },
      {
        name: 'POS',
        description: 'Point of Sale system (staff/admin only)'
      },
      {
        name: 'Viral',
        description: 'Viral scoring and marketing campaigns'
      },
      {
        name: 'Health',
        description: 'System health and monitoring'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authenticated requests. Obtain via /api/v1/auth/login'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'An error occurred'
            },
            errors: {
              type: 'object',
              description: 'Optional detailed error information'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Operation successful'
            },
            data: {
              type: 'object',
              description: 'Response data'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011'
            },
            firstName: {
              type: 'string',
              example: 'John'
            },
            lastName: {
              type: 'string',
              example: 'Doe'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john.doe@example.com'
            },
            role: {
              type: 'string',
              enum: ['customer', 'staff', 'admin'],
              example: 'customer'
            },
            wellnessPoints: {
              type: 'number',
              example: 150
            },
            membershipTier: {
              type: 'string',
              enum: ['bronze', 'silver', 'gold', 'platinum'],
              example: 'silver'
            }
          }
        },
        Product: {
          type: 'object',
          properties: {
            _id: {
              type: 'string'
            },
            name: {
              type: 'string',
              example: 'Premium Grinder'
            },
            description: {
              type: 'string',
              example: 'High-quality aluminum grinder'
            },
            price: {
              type: 'number',
              example: 299.99
            },
            category: {
              type: 'string',
              enum: ['accessories', 'cbd', 'section21', 'coffee'],
              example: 'accessories'
            },
            inventory: {
              type: 'object',
              properties: {
                quantity: {
                  type: 'number',
                  example: 50
                },
                lowStockThreshold: {
                  type: 'number',
                  example: 10
                }
              }
            },
            requiresSection21: {
              type: 'boolean',
              example: false
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'discontinued'],
              example: 'active'
            }
          }
        },
        Order: {
          type: 'object',
          properties: {
            _id: {
              type: 'string'
            },
            orderNumber: {
              type: 'string',
              example: 'ORD-20241121-001'
            },
            user: {
              type: 'string',
              description: 'User ID'
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  product: {
                    type: 'string'
                  },
                  quantity: {
                    type: 'number'
                  },
                  price: {
                    type: 'number'
                  }
                }
              }
            },
            totalAmount: {
              type: 'number',
              example: 599.98
            },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
              example: 'pending'
            },
            paymentStatus: {
              type: 'string',
              enum: ['pending', 'completed', 'failed', 'refunded'],
              example: 'pending'
            }
          }
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'ok'
            },
            database: {
              type: 'string',
              example: 'connected'
            },
            uptime: {
              type: 'number',
              example: 123.456
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-11-21T07:30:00.000Z'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required or invalid token',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Unauthorized access'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'User lacks required permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Forbidden - Insufficient permissions'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Resource not found'
              }
            }
          }
        },
        ValidationError: {
          description: 'Input validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Validation failed',
                errors: {
                  email: 'Invalid email format',
                  password: 'Password must be at least 8 characters'
                }
              }
            }
          }
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                message: 'Internal server error'
              }
            }
          }
        }
      }
    }
  },
  apis: [
    './backend/server.js',
    './backend/routes/*.js'
  ]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

module.exports = swaggerSpec;
