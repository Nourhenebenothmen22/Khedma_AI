import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';

export class AppError extends Error {
  public status: number;
  public details: any;

  constructor(status: number, message: string, details?: any) {
    super(message);
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  // Log error using centralized logger
  logger.error('Unhandled Application Error', err);

  const status = err.status || 500;
  let message = err.message || 'An internal server error occurred.';

  // Sanitize database details
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

  res.status(status).json({
    error: message,
    ...(err.details && { details: err.details })
  });
}
