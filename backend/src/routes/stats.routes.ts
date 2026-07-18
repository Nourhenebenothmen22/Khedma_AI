import { Router } from 'express';
import { statsController } from '../controllers/stats.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

/**
 * GET /api/v1/stats
 * Return quick stats for the recruiter dashboard.
 */
router.get('/', authMiddleware, asyncHandler(statsController.getStats));

export default router;
