import { Request, Response, NextFunction } from 'express';
import { quotaService } from '../services/quota.service.js';

export async function enforceQuota(req: Request, res: Response, next: NextFunction): Promise<void> {
  const tenantId = req.user?.tenantId || 'dev-tenant-id';
  const isDevOrTestMode = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  const headerPlan = isDevOrTestMode ? (req.headers['x-user-plan'] as string) : undefined;
  const plan = req.user?.plan || headerPlan || 'FREE';

  try {
    const quota = await quotaService.checkQuota(tenantId, plan);
    if (!quota.allowed) {
      res.status(429).json({
        error: 'QUOTA_EXCEEDED',
        message: quota.message || 'Monthly generation quota reached',
        plan: quota.plan,
        used: quota.used,
        limit: quota.limit,
        remaining: quota.remaining,
        resetDate: quota.resetDate,
        upgradeUrl: quota.upgradeUrl || '/subscription',
        details: { quota }
      });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
}
