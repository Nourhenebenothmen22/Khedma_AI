import { Router, Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { validateBody } from '../middleware/validate.js';
import { createJobSchema, updateJobSchema } from '../middleware/schemas.js';

const router = Router();

/**
 * GET /api/v1/jobs
 * List all jobs, optionally filtering by favorites or drafts.
 */
router.get('/', async (req: Request, res: Response) => {
  const { isFavorite, isDraft } = req.query;

  try {
    const where: any = {};
    if (isFavorite !== undefined) {
      where.isFavorite = isFavorite === 'true';
    }
    if (isDraft !== undefined) {
      where.isDraft = isDraft === 'true';
    }

    const jobs = await prisma.jobDescription.findMany({
      where,
      orderBy: { updatedAt: 'desc' }
    });

    res.json({ jobs });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch jobs' });
  }
});

/**
 * GET /api/v1/jobs/:id
 * Retrieve a specific job description with its full version history.
 */
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const job = await prisma.jobDescription.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' }
        }
      }
    });

    if (!job) {
      res.status(404).json({ error: 'Job description not found' });
      return;
    }

    res.json({ job });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch job description' });
  }
});

/**
 * POST /api/v1/jobs
 * Create and save a new job description.
 * Validates req.body against createJobSchema.
 */
router.post('/', validateBody(createJobSchema), async (req: Request, res: Response) => {
  const { title, seniority, location, workType, employmentType, language, tone, sections, atsKeywords, isFavorite, isDraft } = req.body;

  try {
    const job = await prisma.jobDescription.create({
      data: {
        title,
        seniority,
        location,
        workType,
        employmentType,
        language,
        tone,
        sections,
        atsKeywords,
        isFavorite,
        isDraft,
        versions: {
          create: {
            versionNumber: 1,
            sections
          }
        }
      }
    });

    res.status(201).json({ job });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create job description' });
  }
});

/**
 * PUT /api/v1/jobs/:id
 * Update an existing job description and append a new version to the history.
 * Validates inputs against updateJobSchema and calculates version inside transaction scope.
 */
router.put('/:id', validateBody(updateJobSchema), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, seniority, location, workType, employmentType, language, tone, sections, atsKeywords, isFavorite, isDraft } = req.body;

  try {
    // Check if job exists
    const existingJob = await prisma.jobDescription.findUnique({
      where: { id }
    });

    if (!existingJob) {
      res.status(404).json({ error: 'Job description not found' });
      return;
    }

    // Build data update
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (seniority !== undefined) updateData.seniority = seniority;
    if (location !== undefined) updateData.location = location;
    if (workType !== undefined) updateData.workType = workType;
    if (employmentType !== undefined) updateData.employmentType = employmentType;
    if (language !== undefined) updateData.language = language;
    if (tone !== undefined) updateData.tone = tone;
    if (sections !== undefined) updateData.sections = sections;
    if (atsKeywords !== undefined) updateData.atsKeywords = atsKeywords;
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite;
    if (isDraft !== undefined) updateData.isDraft = isDraft;

    // Run update and save version inside a transaction to prevent race conditions
    const updatedJob = await prisma.$transaction(async (tx) => {
      // 1. Fetch latest version number within transaction scope
      const latestVersion = await tx.descriptionVersion.findFirst({
        where: { jobDescriptionId: id },
        orderBy: { versionNumber: 'desc' },
        select: { versionNumber: true }
      });
      const nextVersion = (latestVersion?.versionNumber || 0) + 1;

      // 2. Perform main update
      const job = await tx.jobDescription.update({
        where: { id },
        data: updateData
      });

      // 3. Only create a history version if sections are actually being modified
      if (sections !== undefined) {
        await tx.descriptionVersion.create({
          data: {
            jobDescriptionId: id,
            versionNumber: nextVersion,
            sections
          }
        });
      }

      return job;
    });

    res.json({ job: updatedJob });
  } catch (error: any) {
    // Handle Prisma unique constraint failure code (P2002) for race condition
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Save conflict. Another update was processed concurrently. Please retry.' });
      return;
    }
    res.status(500).json({ error: error.message || 'Failed to update job description' });
  }
});

/**
 * DELETE /api/v1/jobs/:id
 * Delete a job description.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.jobDescription.delete({
      where: { id }
    });

    res.json({ message: 'Job description successfully deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete job description' });
  }
});

export default router;
