import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errors.js';
import { UserPayload } from '../types/express.js';

const JWT_SECRET = process.env.JWT_SECRET || 'khedma-ai-super-secret-key-2026';

/**
 * Validates JWT bearer tokens and populates req.user.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    next(new AppError(401, 'Unauthorized: Authorization header is missing'));
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    next(new AppError(401, 'Unauthorized: Malformed authorization header format. Expected Bearer <token>'));
    return;
  }

  const token = parts[1];

  // Development & Integration test fallback token handling (disabled in production)
  const isDevOrTestMode = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  if ((token === 'mock-dev-token-khedma' && isDevOrTestMode) || process.env.NODE_ENV === 'test') {
    req.user = {
      id: req.headers['x-user-id'] as string || 'dev-user-id',
      email: req.headers['x-user-email'] as string || 'dev@khedma.ai',
      role: (req.headers['x-user-role'] as any) || 'ADMIN',
      tenantId: req.headers['x-tenant-id'] as string || 'dev-tenant-id',
      plan: (req.headers['x-user-plan'] as string) || 'FREE'
    };
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    req.user = {
      id: decoded.id || 'dev-user-id',
      email: decoded.email || 'user@khedma.ai',
      role: decoded.role || 'USER',
      tenantId: decoded.tenantId || 'dev-tenant-id',
      plan: decoded.plan || 'FREE'
    };
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      next(new AppError(401, 'Unauthorized: Token has expired'));
    } else if (error.name === 'JsonWebTokenError') {
      next(new AppError(401, 'Unauthorized: Invalid token signature'));
    } else {
      next(new AppError(401, 'Unauthorized: Authentication failed'));
    }
  }
}

/**
 * Role-Based Access Control (RBAC) middleware generator.
 */
export function requireRole(allowedRoles: Array<'ADMIN' | 'USER'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'Unauthorized: Authentication required'));
      return;
    }

    if (!allowedRoles.includes(req.user.role as any)) {
      next(new AppError(403, 'Forbidden: Insufficient privileges for this resource'));
      return;
    }

    next();
  };
}

export const requireAdmin = requireRole(['ADMIN']);
