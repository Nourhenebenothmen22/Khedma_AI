import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import aiRouter from './routes/ai.routes.js';
import jobsRouter from './routes/jobs.routes.js';
import statsRouter from './routes/stats.routes.js';
import { logger } from './config/logger.js';

dotenv.config();

const app = express();
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

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
  console.log(`🔗 Allowed origin: ${frontend_URL}`);
});

export default app;
