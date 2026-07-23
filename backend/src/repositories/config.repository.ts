import { prisma } from '../config/db.js';

export class ConfigRepository {
  async getConfigs(keys: string[]) {
    return prisma.systemConfig.findMany({
      where: {
        key: { in: keys }
      }
    });
  }

  async upsertConfigs(configs: { key: string; value: string }[]) {
    return prisma.$transaction(
      configs.map((c) =>
        prisma.systemConfig.upsert({
          where: { key: c.key },
          update: { value: c.value },
          create: { key: c.key, value: c.value }
        })
      )
    );
  }
}

export const configRepository = new ConfigRepository();
