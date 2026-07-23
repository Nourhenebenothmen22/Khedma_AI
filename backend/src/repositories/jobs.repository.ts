import { prisma } from '../config/db.js';
import { JobDescription } from '@prisma/client';

export interface FindJobsOptions {
  page?: number;
  limit?: number;
  isFavorite?: boolean;
  isDraft?: boolean;
}

export interface PaginatedJobsResult {
  jobs: JobDescription[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class JobsRepository {
  async findAll(tenantId: string, options: FindJobsOptions = {}): Promise<PaginatedJobsResult> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      deletedAt: null
    };

    if (options.isFavorite !== undefined) {
      where.isFavorite = options.isFavorite;
    }
    if (options.isDraft !== undefined) {
      where.isDraft = options.isDraft;
    }

    const [total, jobs] = await Promise.all([
      prisma.jobDescription.count({ where }),
      prisma.jobDescription.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }

  async findById(id: string, tenantId: string): Promise<JobDescription | null> {
    return prisma.jobDescription.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null
      },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' }
        }
      }
    });
  }

  async create(data: {
    userId: string;
    tenantId: string;
    title: string;
    seniority: any;
    location: string;
    workType: any;
    employmentType: any;
    language: string;
    tone: string;
    sections: any;
    atsKeywords?: string[];
    isFavorite?: boolean;
    isDraft?: boolean;
  }): Promise<JobDescription> {
    return prisma.jobDescription.create({
      data: {
        userId: data.userId,
        tenantId: data.tenantId,
        title: data.title,
        seniority: data.seniority || 'Mid',
        location: data.location || 'Remote',
        workType: data.workType || 'Remote',
        employmentType: data.employmentType || 'FullTime',
        language: data.language || 'en',
        tone: data.tone || 'professional',
        sections: data.sections,
        atsKeywords: data.atsKeywords || [],
        isFavorite: data.isFavorite ?? false,
        isDraft: data.isDraft ?? true,
        versions: {
          create: {
            tenantId: data.tenantId,
            versionNumber: 1,
            sections: data.sections
          }
        }
      }
    });
  }

  async update(id: string, tenantId: string, updateData: any): Promise<JobDescription> {
    // 1. Verify tenant isolation & existence before mutation
    const existingJob = await prisma.jobDescription.findFirst({
      where: { id, tenantId, deletedAt: null }
    });
    if (!existingJob) {
      throw new Error('Job description not found or access denied');
    }

    // 2. Perform atomic update & version snapshot in transaction
    return prisma.$transaction(async (tx) => {
      const latestVersion = await tx.descriptionVersion.findFirst({
        where: { jobDescriptionId: id, tenantId },
        orderBy: { versionNumber: 'desc' },
        select: { versionNumber: true }
      });
      const nextVersion = (latestVersion?.versionNumber || 0) + 1;

      const updatedJob = await tx.jobDescription.update({
        where: { id },
        data: updateData
      });

      if (updateData.sections !== undefined) {
        await tx.descriptionVersion.create({
          data: {
            tenantId,
            jobDescriptionId: id,
            versionNumber: nextVersion,
            sections: updateData.sections
          }
        });
      }

      return updatedJob;
    });
  }

  async softDelete(id: string, tenantId: string): Promise<JobDescription> {
    // Verify tenant scope before deletion
    const existingJob = await prisma.jobDescription.findFirst({
      where: { id, tenantId, deletedAt: null }
    });
    if (!existingJob) {
      throw new Error('Job description not found or access denied');
    }

    return prisma.jobDescription.update({
      where: { id },
      data: {
        deletedAt: new Date()
      }
    });
  }
}

export const jobsRepository = new JobsRepository();
