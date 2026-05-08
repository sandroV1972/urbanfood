const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
        title: 'SurfShack API',
        version: '1.0.0',
        description: 'API REST per la piattaforma di SurfShack'
    },
    servers: [
        {
            url: 'http://localhost:4001',
            description: 'Development server'
        }
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
            }
        },
        schemas: {
            Restaurant: {
                type: 'object',
                properties: {
                    _id:         { type: 'string' },
                    name:        { type: 'string' },
                    address:     { type: 'string' },
                    phone:       { type: 'string' },
                    piva:        { type: 'string' },
                    description: { type: 'string' },
                    image:       { type: 'string' },
                    owner:       { type: 'string', description: 'ID utente proprietario' }
                },
                required: ['name', 'address', 'phone', 'piva']
            },
            MenuItem: {
                type: 'object',
                properties: {
                    _id:             { type: 'string' },
                    restaurant:      { type: 'string', description: 'ID del ristorante' },
                    idMeal:          { type: 'string' },
                    strMeal:         { type: 'string' },
                    strCategory:     { type: 'string' },
                    strArea:         { type: 'string' },
                    strInstructions: { type: 'string' },
                    strMealThumb:    { type: 'string' },
                    strTags:         { type: 'string' },
                    ingredients:     { type: 'array', items: { type: 'string' } },
                    measures:        { type: 'array', items: { type: 'string' } },
                    price:           { type: 'number' },
                    available:       { type: 'boolean' }
                },
                required: ['strMeal', 'price']
            },
            Meal: {
                type: 'object',
                properties: {
                    _id:             { type: 'string' },
                    idMeal:          { type: 'string' },
                    strMeal:         { type: 'string' },
                    strCategory:     { type: 'string' },
                    strArea:         { type: 'string' },
                    strInstructions: { type: 'string' },
                    strMealThumb:    { type: 'string' },
                    strTags:         { type: 'string' },
                    ingredients:     { type: 'array', items: { type: 'string' } },
                    measures:        { type: 'array', items: { type: 'string' } }
                }
            },
            Review: {
                type: 'object',
                properties: {
                    _id:        { type: 'string' },
                    user:       { type: 'string' },
                    restaurant: { type: 'string' },
                    rating:     { type: 'number', minimum: 1, maximum: 5 },
                    comment:    { type: 'string' },
                    createdAt:  { type: 'string', format: 'date-time' }
                }
            },
            OrderItem: {
                type: 'object',
                properties: {
                    menuItem: { type: 'string', description: 'ID del menu item' },
                    quantity: { type: 'integer' },
                    price:    { type: 'number' }
                },
                required: ['menuItem', 'quantity', 'price']
            },
            Order: {
                type: 'object',
                properties: {
                    _id:           { type: 'string' },
                    user:          { type: 'string', description: 'ID utente cliente' },
                    restaurant:    { type: 'string', description: 'ID ristorante' },
                    items: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/OrderItem' }
                    },
                    total:         { type: 'number' },
                    delivery_cost: { type: 'number' },
                    people:        { type: 'integer' },
                    status: {
                        type: 'string',
                        enum: ['ordinato', 'in_preparazione', 'in_consegna', 'consegnato']
                    },
                    date: { type: 'string', format: 'date-time' },
                    delivery: {
                        type: 'object',
                        properties: {
                            dove:      { type: 'string', enum: ['ristorante', 'domicilio'] },
                            indirizzo: { type: 'string' }
                        }
                    }
                },
                required: ['restaurant', 'items', 'total', 'status', 'people']
            },
            User: {
                type: 'object',
                properties: {
                    _id:     { type: 'string' },
                    name:    { type: 'string' },
                    email:   { type: 'string', format: 'email' },
                    usrType: { type: 'string', enum: ['ristoratore', 'cliente'] },
                    phone:   { type: 'string' },
                    address: {
                        type: 'object',
                        properties: {
                            street:    { type: 'string' },
                            city:      { type: 'string' },
                            province:  { type: 'string' },
                            zip:       { type: 'string' },
                            country:   { type: 'string' },
                            formatted: { type: 'string' }
                        }
                    }
                }
            },
            AuthResponse: {
                type: 'object',
                properties: {
                    token: { type: 'string', description: 'JWT da usare come Bearer' },
                    user: {
                        type: 'object',
                        properties: {
                            name:    { type: 'string' },
                            email:   { type: 'string' },
                            usrType: { type: 'string', enum: ['ristoratore', 'cliente'] }
                        }
                    }
                }
            },
            Error: {
                type: 'object',
                properties: {
                    error: { type: 'string' }
                }
            }
        }
    }
  },
  apis: ['./routes/*.js']
};

const openapiSpecification = swaggerJsdoc(options);
module.exports = openapiSpecification;
