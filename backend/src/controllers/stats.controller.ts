import { Request, Response, NextFunction } from 'express';
import { statsRepository } from '../repositories/stats.repository.js';

export class StatsController {
  getStats = async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.user?.tenantId || 'dev-tenant-id';
    const plan = (req.headers['x-user-plan'] as string) || 'FREE';
    const stats = await statsRepository.getStats(tenantId, plan);
    res.json(stats);
  };
}

export const statsController = new StatsController();
