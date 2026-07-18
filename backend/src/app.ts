import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import aiRouter from './routes/ai.routes.js';
import jobsRouter from './routes/jobs.routes.js';
import statsRouter from './routes/stats.routes.js';
import { logger } from './config/logger.js';
import { prisma } from './config/db.js';

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});

dotenv.config();

const app = express();
app.set('trust proxy', 1);
app.use(helmet());
const PORT = process.env.PORT || 5000;
const frontend_URL = process.env.frontend_URL || 'http://localhost:5173';

// Setup CORS
app.use(cors({
  origin: frontend_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Parse body payloads
app.use(express.json());

// Main entry route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'AI Job Description Generator Backend is running.' });
});

// Configure AI rate limiter
const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after a minute.' }
});

// Configure API endpoints
app.use('/api/v1/ai', aiRouter);
app.use('/api/v1/jobs', jobsRouter);
app.use('/api/v1/stats', statsRouter);

// Global Error Handler with Winston logging
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled Application Error', err);
  
  const status = err.status || 500;
  let message = err.message || 'An internal server error occurred.';
  
  // Sanitize internal database details dynamically using environment properties and regex
  const dbUrl = process.env.DATABASE_URL || '';
  const dbHost = dbUrl.split('@')[1]?.split(':')[0] || '';
  
  if (
    message.includes('postgresql://') || 
    (dbHost && message.includes(dbHost)) || 
    message.includes('Prisma') ||
    /db\.[a-z0-9]+\.supabase/i.test(message)
  ) {
    message = 'A database connection or query error occurred. Please check configuration settings.';
  } else if (process.env.NODE_ENV === 'production' && status === 500) {
    message = 'An internal server error occurred. Please try again later.';
  }
  
  res.status(status).json({ error: message });
});

// Start Server (bind to all interfaces: required for Render & containerized environments)
const HOST = process.env.HOST || '0.0.0.0';
let server: any;

if (process.env.NODE_ENV !== 'test') {
  server = app.listen(Number(PORT), HOST, async () => {
    console.log(`🚀 Server started on ${HOST}:${PORT}`);
    console.log(`🔗 Allowed origin: ${frontend_URL}`);
    
    try {
      console.log('Testing database connection...');
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Database connection check successful.');
    } catch (dbError) {
      console.error('❌ Database connection check failed on startup:', dbError);
    }
  });
}

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  console.log(`\n⚙️ Received ${signal}. Starting graceful shutdown...`);
  
  const disconnectDb = async () => {
    try {
      await prisma.$disconnect();
      console.log('Database client disconnected.');
      process.exit(0);
    } catch (err) {
      console.error('Error during database disconnection:', err);
      process.exit(1);
    }
  };

  if (server) {
    server.close(async () => {
      console.log('HTTP server closed.');
      await disconnectDb();
    });
  } else {
    await disconnectDb();
  }

  // Force shutdown after 10 seconds if connections are stuck
  setTimeout(() => {
    console.error('Force shutdown: could not close all connections within 10s');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
