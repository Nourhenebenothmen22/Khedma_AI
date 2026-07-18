import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';

export class StatsController {
  getStats = async (req: Request, res: Response, next: NextFunction) => {
    const totalGenerations = await prisma.usageStat.count({
      where: { action: 'generate_full' }
    });

    const totalRefinements = await prisma.usageStat.count({
      where: { action: { startsWith: 'refine_' } }
    });

    const activeDrafts = await prisma.jobDescription.count({
      where: { isDraft: true }
    });

    const favoriteTemplates = await prisma.jobDescription.count({
      where: { isFavorite: true }
    });

    // Get simple counts by seniority
    const seniorityGroup = await prisma.jobDescription.groupBy({
      by: ['seniority'],
      _count: {
        id: true
      }
    });

    // Get total tokens used estimate
    const tokensAggregate = await prisma.usageStat.aggregate({
      _sum: {
        tokensUsed: true
      }
    });

    res.json({
      totalGenerations,
      totalRefinements,
      activeDrafts,
      favoriteTemplates,
      totalTokensEstimated: tokensAggregate._sum.tokensUsed || 0,
      seniorityDistribution: seniorityGroup.map(g => ({
        seniority: g.seniority,
        count: g._count.id
      }))
    });
  };
}

export const statsController = new StatsController();
