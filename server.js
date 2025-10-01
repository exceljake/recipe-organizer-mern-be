const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const connectDB = require('./config/database');

console.log('Starting Recipe Organizer API...');

const app = express();

// Connect to database
connectDB();

// Trust proxy for deployment platforms
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://sharecipe-organizer.vercel.app'
      ]
    : ['http://localhost:3000', 'http://localhost:3002', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/recipes', require('./routes/recipes'));

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Recipe Organizer API',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    endpoints: {
      health: '/api/health',
      recipes: '/api/recipes',
      search: '/api/recipes/search'
    },
    documentation: {
      postman: 'Import the API collection for testing',
      github: 'https://github.com/yourusername/recipe-organizer'
    }
  });
});

// Health check route
app.get('/api/health', (req, res) => {
  const healthCheck = {
    success: true,
    message: 'Recipe Organizer API is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    database: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      host: mongoose.connection.host || 'Not connected',
      name: mongoose.connection.name || 'Not specified'
    },
    memory: process.memoryUsage(),
    node_version: process.version
  };
  
  res.status(200).json(healthCheck);
});

// API documentation route
app.get('/api/docs', (req, res) => {
  res.status(200).json({
    success: true,
    title: 'Recipe Organizer API Documentation',
    version: '1.0.0',
    baseURL: `${req.protocol}://${req.get('host')}`,
    endpoints: [
      {
        method: 'GET',
        path: '/api/recipes',
        description: 'Get all recipes (paginated)',
        parameters: {
          page: 'number (optional, default: 1)',
          limit: 'number (optional, default: 10)'
        }
      },
      {
        method: 'GET',
        path: '/api/recipes/:id',
        description: 'Get a single recipe by ID'
      },
      {
        method: 'POST',
        path: '/api/recipes',
        description: 'Create a new recipe',
        body: 'Recipe object (see schema below)'
      },
      {
        method: 'PUT',
        path: '/api/recipes/:id',
        description: 'Update a recipe'
      },
      {
        method: 'DELETE',
        path: '/api/recipes/:id',
        description: 'Delete a recipe'
      },
      {
        method: 'GET',
        path: '/api/recipes/search',
        description: 'Search recipes',
        parameters: {
          q: 'text search query',
          ingredient: 'search by ingredient',
          difficulty: 'easy|medium|hard',
          page: 'number (optional)',
          limit: 'number (optional)'
        }
      }
    ],
    schema: {
      recipe: {
        title: 'string (required, 3-100 chars)',
        ingredients: 'array of strings (required, min 1)',
        instructions: 'string (required, 10-2000 chars)',
        cookingTime: 'number (optional, min 1 minute)',
        servings: 'number (optional, min 1)',
        difficulty: 'string (optional, enum: easy|medium|hard)',
        tags: 'array of strings (optional)'
      }
    }
  });
});

// Global error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: errors
    });
  }

  // Mongoose CastError (invalid ObjectId)
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  // MongoDB duplicate key error
  if (error.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate field value entered'
    });
  }

  // Default error
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// 404 handler - must be last
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableRoutes: [
      'GET /',
      'GET /api/health',
      'GET /api/docs',
      'GET /api/recipes',
      'POST /api/recipes',
      'GET /api/recipes/:id',
      'PUT /api/recipes/:id',
      'DELETE /api/recipes/:id',
      'GET /api/recipes/search'
    ]
  });
});

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Recipe Organizer API running in ${process.env.NODE_ENV} mode`);
  console.log(`📡 Server listening on port ${PORT}`);
  console.log(`🌐 Access at: http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📖 Documentation: http://localhost:${PORT}/api/docs`);
});

// Graceful shutdown handling
const gracefulShutdown = () => {
  console.log('\n🔄 Received shutdown signal, closing server...');
  
  // 1. Close the HTTP Server
  server.close(() => {
    console.log('✅ HTTP server closed');
    
    // 2. Close the Mongoose Connection using PROMISE syntax
    mongoose.connection.close()
      .then(() => {
        console.log('✅ MongoDB connection closed gracefully');
        process.exit(0);
      })
      .catch((err) => {
        console.error('❌ Mongoose connection failed to close:', err);
        process.exit(1);
      });
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    console.error('⚠️  Forcing shutdown after 30s timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  gracefulShutdown();
});

module.exports = app;
