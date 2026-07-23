import { Request, Response, NextFunction } from 'express';
import { jobsRepository } from '../repositories/jobs.repository.js';
import { AppError } from '../middleware/errors.js';

function normalizeEmploymentType(type?: string): any {
  if (!type) return 'FullTime';
  if (type === 'Full-time' || type === 'FullTime') return 'FullTime';
  if (type === 'Part-time' || type === 'PartTime') return 'PartTime';
  if (type === 'Contract') return 'Contract';
  if (type === 'Internship') return 'Internship';
  return 'FullTime';
}

export class JobsController {
  getJobs = async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.user?.tenantId || 'dev-tenant-id';
    const { isFavorite, isDraft, page, limit } = req.query;

    const result = await jobsRepository.findAll(tenantId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      isFavorite: isFavorite !== undefined ? isFavorite === 'true' : undefined,
      isDraft: isDraft !== undefined ? isDraft === 'true' : undefined
    });

    res.json({
      jobs: result.jobs,
      pagination: result.pagination
    });
  };

  getJobById = async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.user?.tenantId || 'dev-tenant-id';
    const { id } = req.params;

    const job = await jobsRepository.findById(id, tenantId);

    if (!job) {
      throw new AppError(404, 'Job description not found');
    }

    res.json({ job });
  };

  createJob = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id || 'dev-user-id';
    const tenantId = req.user?.tenantId || 'dev-tenant-id';
    const { title, seniority, location, workType, employmentType, language, tone, sections, atsKeywords, isFavorite, isDraft } = req.body;

    const normalizedEmployment = normalizeEmploymentType(employmentType);

    const job = await jobsRepository.create({
      userId,
      tenantId,
      title,
      seniority,
      location,
      workType,
      employmentType: normalizedEmployment,
      language,
      tone,
      sections,
      atsKeywords,
      isFavorite,
      isDraft
    });

    res.status(201).json({ job });
  };

  updateJob = async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.user?.tenantId || 'dev-tenant-id';
    const { id } = req.params;
    const { title, seniority, location, workType, employmentType, language, tone, sections, atsKeywords, isFavorite, isDraft } = req.body;

    const existingJob = await jobsRepository.findById(id, tenantId);
    if (!existingJob) {
      throw new AppError(404, 'Job description not found');
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (seniority !== undefined) updateData.seniority = seniority;
    if (location !== undefined) updateData.location = location;
    if (workType !== undefined) updateData.workType = workType;
    if (employmentType !== undefined) updateData.employmentType = normalizeEmploymentType(employmentType);
    if (language !== undefined) updateData.language = language;
    if (tone !== undefined) updateData.tone = tone;
    if (sections !== undefined) updateData.sections = sections;
    if (atsKeywords !== undefined) updateData.atsKeywords = atsKeywords;
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite;
    if (isDraft !== undefined) updateData.isDraft = isDraft;

    try {
      const updatedJob = await jobsRepository.update(id, tenantId, updateData);
      res.json({ job: updatedJob });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new AppError(409, 'Save conflict. Another update was processed concurrently. Please retry.');
      }
      throw error;
    }
  };

  deleteJob = async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.user?.tenantId || 'dev-tenant-id';
    const { id } = req.params;

    const existingJob = await jobsRepository.findById(id, tenantId);
    if (!existingJob) {
      throw new AppError(404, 'Job description not found');
    }

    await jobsRepository.softDelete(id, tenantId);

    res.json({ message: 'Job description successfully deleted' });
  };
}

export const jobsController = new JobsController();
