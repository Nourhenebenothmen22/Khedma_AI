import { prisma } from '../config/db.js';
import { quotaService, QuotaCheckResult } from '../services/quota.service.js';

export interface DashboardStatsResult {
  totalGenerations: number;
  totalRefinements: number;
  activeDrafts: number;
  favoriteTemplates: number;
  totalTokensEstimated: number;
  seniorityDistribution: { seniority: string; count: number }[];
  quota: QuotaCheckResult;
}

export class StatsRepository {
  async getStats(tenantId: string, userPlan: string = 'FREE'): Promise<DashboardStatsResult> {
    // Execute all database metrics in parallel for maximum concurrency
    const [
      totalGenerations,
      aiRefinements,
      totalVersions,
      totalJobs,
      activeDrafts,
      favoriteTemplates,
      seniorityGroup,
      tokensAggregate,
      quota
    ] = await Promise.all([
      prisma.usageStat.count({
        where: { tenantId, action: 'generate_full' }
      }),
      prisma.usageStat.count({
        where: { tenantId, action: { startsWith: 'refine_' } }
      }),
      prisma.descriptionVersion.count({
        where: { tenantId }
      }),
      prisma.jobDescription.count({
        where: { tenantId, deletedAt: null }
      }),
      prisma.jobDescription.count({
        where: { tenantId, isDraft: true, deletedAt: null }
      }),
      prisma.jobDescription.count({
        where: { tenantId, isDraft: false, deletedAt: null }
      }),
      prisma.jobDescription.groupBy({
        by: ['seniority'],
        where: { tenantId, deletedAt: null },
        _count: { id: true }
      }),
      prisma.usageStat.aggregate({
        where: { tenantId },
        _sum: { tokensUsed: true }
      }),
      quotaService.checkQuota(tenantId, userPlan)
    ]);

    const versionRefinements = Math.max(0, totalVersions - totalJobs);

    return {
      totalGenerations,
      totalRefinements: aiRefinements + versionRefinements,
      activeDrafts,
      favoriteTemplates,
      totalTokensEstimated: tokensAggregate._sum.tokensUsed || 0,
      seniorityDistribution: seniorityGroup.map((g) => ({
        seniority: g.seniority,
        count: g._count.id
      })),
      quota
    };
  }

  async logUsage(userId: string, tenantId: string, action: string, tokensUsed: number): Promise<void> {
    try {
      await prisma.usageStat.create({
        data: {
          userId,
          tenantId,
          action,
          tokensUsed
        }
      });
    } catch (error) {
      console.error('Failed to log usage stat:', error);
    }
  }
}

export const statsRepository = new StatsRepository();
