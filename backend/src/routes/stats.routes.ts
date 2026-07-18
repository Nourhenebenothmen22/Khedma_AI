import { Router, Request, Response } from 'express';
import { prisma } from '../config/db.js';

const router = Router();

/**
 * GET /api/v1/stats
 * Return quick stats for the recruiter dashboard.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
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
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to retrieve usage stats' });
  }
});

export default router;
