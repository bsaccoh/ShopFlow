const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'BabahPOS Multi-Tenant API',
            version: '1.0.0',
            description: 'API documentation for the Multi-Tenant SaaS POS Application',
            contact: {
                name: 'API Support',
                email: 'support@babahpos.com',
            },
        },
        servers: [
            {
                url: 'http://localhost:5000/api/v1',
                description: 'Local Development Server',
            },
            {
                url: 'https://api.babahpos.com/api/v1',
                description: 'Production Server',
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT token in the format: Bearer <token>'
                },
            },
        },
        security: [{
            bearerAuth: []
        }],
    },
    // Paths to files containing OpenAPI definitions
    apis: ['./modules/**/*.js', './routes.js'],
};

const swaggerSpec = swaggerJsdoc(options);

const setupSwagger = (app) => {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: "BabahPOS API Documentation",
    }));
    console.log('📄 Swagger documentation available at /api-docs');
};

module.exports = setupSwagger;
