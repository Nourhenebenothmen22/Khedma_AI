import { Router } from 'express';
import { jobsController } from '../controllers/jobs.controller.js';
import { validateBody } from '../middleware/validate.js';
import { createJobSchema, updateJobSchema } from '../middleware/schemas.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// Apply authMiddleware globally to all jobs CRUD endpoints
router.use(authMiddleware);

/**
 * GET /api/v1/jobs
 * List all jobs, optionally filtering by favorites or drafts.
 */
router.get('/', asyncHandler(jobsController.getJobs));

/**
 * GET /api/v1/jobs/:id
 * Retrieve a specific job description with its full version history.
 */
router.get('/:id', asyncHandler(jobsController.getJobById));

/**
 * POST /api/v1/jobs
 * Create and save a new job description.
 */
router.post('/', validateBody(createJobSchema), asyncHandler(jobsController.createJob));

/**
 * PUT /api/v1/jobs/:id
 * Update an existing job description and append a new version to the history.
 */
router.put('/:id', validateBody(updateJobSchema), asyncHandler(jobsController.updateJob));

/**
 * DELETE /api/v1/jobs/:id
 * Delete a job description.
 */
router.delete('/:id', asyncHandler(jobsController.deleteJob));

export default router;
