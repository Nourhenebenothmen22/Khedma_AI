import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock PrismaClient to spy on the constructor configuration
class MockPrismaClient {
  static constructorSpy = vi.fn();
  config: any;
  constructor(config: any) {
    this.config = config;
    MockPrismaClient.constructorSpy(config);
  }
}

vi.mock('@prisma/client', () => {
  return {
    PrismaClient: MockPrismaClient,
  };
});

describe('Database Isolation Config Selection', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('should use TEST_DATABASE_URL if NODE_ENV is test and TEST_DATABASE_URL is set', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('TEST_DATABASE_URL', 'postgresql://test_host/test_db');
    vi.stubEnv('DATABASE_URL', 'postgresql://prod_host/prod_db');

    await import('../src/config/db.js');
    expect(MockPrismaClient.constructorSpy).toHaveBeenCalledWith({
      datasources: {
        db: {
          url: 'postgresql://test_host/test_db',
        },
      },
    });
  });

  it('should fall back to DATABASE_URL if TEST_DATABASE_URL is not set', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('TEST_DATABASE_URL', '');
    vi.stubEnv('DATABASE_URL', 'postgresql://prod_host/prod_db');

    await import('../src/config/db.js');

    expect(MockPrismaClient.constructorSpy).toHaveBeenCalledWith({
      datasources: {
        db: {
          url: 'postgresql://prod_host/prod_db',
        },
      },
    });
  });
});
