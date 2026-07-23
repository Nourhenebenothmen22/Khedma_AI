import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import aiRouter from './routes/ai.routes.js';
import jobsRouter from './routes/jobs.routes.js';
import statsRouter from './routes/stats.routes.js';
import { logger } from './config/logger.js';
import { prisma } from './config/db.js';
import { globalRateLimiter } from './middleware/rateLimiters.js';
import { errorHandler } from './middleware/errors.js';

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('UNHANDLED REJECTION:', reason);
});

const app = express();
app.set('trust proxy', 1);

// Configure Helmet with robust REST API defaults
app.use(helmet());

const PORT = process.env.PORT || 5000;
const frontend_URL = process.env.frontend_URL || 'http://localhost:5173';

// Setup CORS with configurable origins
const allowedOrigins = frontend_URL.split(',').map(url => url.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-plan', 'x-plan'],
  credentials: true
}));

// Parse body payloads
app.use(express.json());

// Utility health check endpoint (exempt from rate limits and auth)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'AI Job Description Generator Backend is running.' });
});

// Apply global rate limiting to all /api/v1 endpoints
app.use('/api/v1', globalRateLimiter);

// Configure API endpoints
app.use('/api/v1/ai', aiRouter);
app.use('/api/v1/jobs', jobsRouter);
app.use('/api/v1/stats', statsRouter);

// Centralized error handling middleware
app.use(errorHandler);

// Start Server (bind to all interfaces: required for Render & containerized environments)
const HOST = process.env.HOST || '0.0.0.0';
let server: any;

if (process.env.NODE_ENV !== 'test') {
  server = app.listen(Number(PORT), HOST, async () => {
    logger.info(`🚀 Server started on ${HOST}:${PORT}`);
    logger.info(`🔗 Allowed origins: ${allowedOrigins.join(', ')}`);
    
    try {
      logger.info('Testing database connection...');
      await prisma.$queryRaw`SELECT 1`;
      logger.info('✅ Database connection check successful.');
    } catch (dbError) {
      logger.error('❌ Database connection check failed on startup:', dbError);
    }
  });
}

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`\n⚙️ Received ${signal}. Starting graceful shutdown...`);
  
  const disconnectDb = async () => {
    try {
      await prisma.$disconnect();
      logger.info('Database client disconnected.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during database disconnection:', err);
      process.exit(1);
    }
  };

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed.');
      await disconnectDb();
    });
  } else {
    await disconnectDb();
  }

  // Force shutdown after 10 seconds if connections are stuck
  setTimeout(() => {
    logger.error('Force shutdown: could not close all connections within 10s');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
