import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { AppError } from '../middleware/errors.js';

export class JobsController {
  getJobs = async (req: Request, res: Response, next: NextFunction) => {
    const { isFavorite, isDraft } = req.query;

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
  };

  getJobById = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const job = await prisma.jobDescription.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' }
        }
      }
    });

    if (!job) {
      throw new AppError(404, 'Job description not found');
    }

    res.json({ job });
  };

  createJob = async (req: Request, res: Response, next: NextFunction) => {
    const { title, seniority, location, workType, employmentType, language, tone, sections, atsKeywords, isFavorite, isDraft } = req.body;

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
  };

  updateJob = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { title, seniority, location, workType, employmentType, language, tone, sections, atsKeywords, isFavorite, isDraft } = req.body;

    // Check if job exists
    const existingJob = await prisma.jobDescription.findUnique({
      where: { id }
    });

    if (!existingJob) {
      throw new AppError(404, 'Job description not found');
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

    try {
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
        throw new AppError(409, 'Save conflict. Another update was processed concurrently. Please retry.');
      }
      throw error;
    }
  };

  deleteJob = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    // Check if job exists
    const existingJob = await prisma.jobDescription.findUnique({
      where: { id }
    });

    if (!existingJob) {
      throw new AppError(404, 'Job description not found');
    }

    await prisma.jobDescription.delete({
      where: { id }
    });

    res.json({ message: 'Job description successfully deleted' });
  };
}

export const jobsController = new JobsController();
