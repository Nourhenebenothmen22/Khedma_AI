import { Request, Response, NextFunction } from 'express';
import { AppError } from './errors.js';

/**
 * Middleware to check if the Authorization header is present.
 * If not present, routes a 401 Unauthorized AppError to next().
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    next(new AppError(401, 'Unauthorized: Authorization header is missing'));
    return;
  }
  next();
}

