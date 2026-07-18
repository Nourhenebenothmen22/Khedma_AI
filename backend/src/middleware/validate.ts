import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from './errors.js';

/**
 * Validates the Express request body against a Zod schema.
 * Replaces req.body with the sanitized parsed value to strip unexpected fields.
 */
export function validateBody(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync(req.body);
      req.body = parsed; // Replace with validated/parsed data
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message
        }));
        next(new AppError(400, 'Input validation failed', details));
        return;
      }
      next(error);
    }
  };
}

