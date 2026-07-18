import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check if the Authorization header is present.
 * If not present, returns a 401 Unauthorized response.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Unauthorized: Authorization header is missing' });
    return;
  }
  next();
}
