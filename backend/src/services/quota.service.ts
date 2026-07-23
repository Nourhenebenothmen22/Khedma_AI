import { prisma } from '../config/db.js';

export interface QuotaCheckResult {
  allowed: boolean;
  currentGenerations: number;
  used: number;
  limit: number;
  remaining: number;
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  resetDate: string;
  upgradeUrl?: string;
  message?: string;
}

export class QuotaService {
  private getPlanLimit(plan: string): number {
    switch (plan.toUpperCase()) {
      case 'PRO':
        return 500;
      case 'ENTERPRISE':
        return 999999; // Unlimited
      case 'FREE':
      default:
        return 15;
    }
  }

  async checkQuota(tenantId: string, userPlan: string = 'FREE'): Promise<QuotaCheckResult> {
    const limit = this.getPlanLimit(userPlan);

    // Calculate start of current calendar month & next reset date in UTC
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const nextResetDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();

    const used = await prisma.usageStat.count({
      where: {
        tenantId,
        action: 'generate_full',
        createdAt: {
          gte: startOfMonth
        }
      }
    });

    const remaining = Math.max(0, limit - used);
    const allowed = used < limit;
    const normalizedPlan = (userPlan.toUpperCase() as 'FREE' | 'PRO' | 'ENTERPRISE') || 'FREE';

    return {
      allowed,
      currentGenerations: used,
      used,
      limit,
      remaining,
      plan: normalizedPlan,
      resetDate: nextResetDate,
      upgradeUrl: '/subscription',
      ...(!allowed && {
        message: `Monthly quota of ${limit} generations reached for plan ${normalizedPlan}. Upgrade your subscription to continue.`
      })
    };
  }
}

export const quotaService = new QuotaService();
