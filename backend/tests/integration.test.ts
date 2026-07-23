import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

// Mock DB configuration module
vi.mock('../src/config/db.js', () => {
  const mockPrisma = {
    jobDescription: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    descriptionVersion: {
      findFirst: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    systemConfig: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    usageStat: {
      create: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn().mockResolvedValue({ _sum: { tokensUsed: 0 } }),
    },
    $transaction: vi.fn((arg) => {
      if (typeof arg === 'function') {
        return arg(mockPrisma);
      }
      return Promise.all(arg);
    }),
  };
  return {
    prisma: mockPrisma,
  };
});

// Mock LLM service
vi.mock('../src/services/llm.service.js', () => {
  return {
    OpenRouterLLMProvider: class {
      generateStream = vi.fn().mockImplementation(
        async (provider, model, options, language, schema, onChunk, signal) => {
          onChunk('{"title": "Senior Staff Architect (Test)", ');
          onChunk('"summary": "Verify frontend backend streaming"}');
          return '{"title": "Senior Staff Architect (Test)", "summary": "Verify frontend backend streaming"}';
        }
      );
      refine = vi.fn().mockResolvedValue('Refined content from test LLM Mock');
    },
  };
});

// Mock rate limiter to avoid test limits
vi.mock('express-rate-limit', () => {
  return {
    default: () => (req: any, res: any, next: any) => next(),
  };
});

// Import the mocked prisma client to set mock return values in tests
import { prisma } from '../src/config/db.js';

describe('Frontend ↔ Backend Integration Endpoint Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CORS Headers & Base Health', () => {
    it('should respond with CORS headers', async () => {
      const res = await request(app)
        .options('/api/v1/jobs')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);

      expect(res.header['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('should report healthy state', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.body.status).toBe('ok');
    });
  });

  describe('Authentication & RBAC Controls', () => {
    it('should reject requests without authorization header', async () => {
      const res = await request(app)
        .get('/api/v1/jobs')
        .expect(401);

      expect(res.body.error).toContain('Authorization header is missing');
    });

    it('should reject malformed authorization headers', async () => {
      const res = await request(app)
        .get('/api/v1/jobs')
        .set('Authorization', 'InvalidTokenFormat')
        .expect(401);

      expect(res.body.error).toContain('Malformed authorization header format');
    });

    it('should enforce RBAC admin check on PUT /api/v1/ai/settings', async () => {
      const payload = {
        provider: 'openrouter',
        model: 'llama-3.1-8b',
        language: 'fr',
      };

      // Normal USER role attempt -> expect 403 Forbidden
      const userRes = await request(app)
        .put('/api/v1/ai/settings')
        .set('Authorization', 'Bearer mock-dev-token')
        .set('x-user-role', 'USER')
        .send(payload)
        .expect(403);

      expect(userRes.body.error).toContain('Forbidden');

      // Admin role attempt -> expect 200 OK
      vi.mocked(prisma.systemConfig.upsert).mockResolvedValue({
        key: 'active_llm_provider',
        value: 'openrouter',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const adminRes = await request(app)
        .put('/api/v1/ai/settings')
        .set('Authorization', 'Bearer mock-dev-token')
        .set('x-user-role', 'ADMIN')
        .send(payload)
        .expect(200);

      expect(adminRes.body.message).toContain('success');
    });
  });

  describe('CRUD Operations & Pagination (/api/v1/jobs)', () => {
    const mockJob = {
      id: 'test-job-id-123',
      userId: 'dev-user-id',
      tenantId: 'dev-tenant-id',
      title: 'QA Lead Architect',
      seniority: 'Lead',
      location: 'Remote',
      workType: 'Remote',
      employmentType: 'FullTime',
      language: 'en',
      tone: 'professional',
      sections: { summary: 'Design automated testing suites.' },
      atsKeywords: ['QA', 'Automation'],
      isFavorite: false,
      isDraft: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };

    it('GET /api/v1/jobs - list jobs with pagination metadata', async () => {
      vi.mocked(prisma.jobDescription.count).mockResolvedValue(1);
      vi.mocked(prisma.jobDescription.findMany).mockResolvedValue([mockJob]);

      const res = await request(app)
        .get('/api/v1/jobs?page=1&limit=10')
        .set('Authorization', 'Bearer mock-dev-token')
        .expect(200);

      expect(res.body.jobs).toBeDefined();
      expect(res.body.jobs.length).toBe(1);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(10);
      expect(res.body.pagination.total).toBe(1);
    });

    it('GET /api/v1/jobs/:id - fetch a single job', async () => {
      vi.mocked(prisma.jobDescription.findFirst).mockResolvedValue({
        ...mockJob,
        versions: [{ id: 'v1', tenantId: 'dev-tenant-id', jobDescriptionId: 'test-job-id-123', versionNumber: 1, sections: mockJob.sections, createdAt: new Date().toISOString() }],
      } as any);

      const res = await request(app)
        .get('/api/v1/jobs/test-job-id-123')
        .set('Authorization', 'Bearer mock-dev-token')
        .expect(200);

      expect(res.body.job).toBeDefined();
      expect(res.body.job.id).toBe('test-job-id-123');
    });

    it('POST /api/v1/jobs - create a new job', async () => {
      vi.mocked(prisma.jobDescription.create).mockResolvedValue(mockJob);

      const payload = {
        title: 'QA Lead Architect',
        seniority: 'Lead',
        location: 'Remote',
        workType: 'Remote',
        employmentType: 'Full-time',
        language: 'en',
        tone: 'professional',
        sections: { summary: 'Design automated testing suites.' },
        atsKeywords: ['QA', 'Automation'],
        isFavorite: false,
        isDraft: true,
      };

      const res = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', 'Bearer mock-dev-token')
        .send(payload)
        .expect(201);

      expect(res.body.job).toBeDefined();
      expect(res.body.job.title).toBe('QA Lead Architect');
    });

    it('PUT /api/v1/jobs/:id - update existing job', async () => {
      vi.mocked(prisma.jobDescription.findFirst).mockResolvedValue(mockJob);
      vi.mocked(prisma.descriptionVersion.findFirst).mockResolvedValue({ id: 'v1', tenantId: 'dev-tenant-id', jobDescriptionId: 'test-job-id-123', versionNumber: 1, sections: mockJob.sections, createdAt: new Date().toISOString() });
      vi.mocked(prisma.jobDescription.update).mockResolvedValue({
        ...mockJob,
        title: 'Updated QA Architect Title',
      });

      const payload = {
        title: 'Updated QA Architect Title',
        sections: { summary: 'Design and manage automated testing pipelines.' },
      };

      const res = await request(app)
        .put('/api/v1/jobs/test-job-id-123')
        .set('Authorization', 'Bearer mock-dev-token')
        .send(payload)
        .expect(200);

      expect(res.body.job.title).toBe('Updated QA Architect Title');
    });

    it('DELETE /api/v1/jobs/:id - soft delete a job', async () => {
      vi.mocked(prisma.jobDescription.findFirst).mockResolvedValue(mockJob);
      vi.mocked(prisma.jobDescription.update).mockResolvedValue({ ...mockJob, deletedAt: new Date() });

      const res = await request(app)
        .delete('/api/v1/jobs/test-job-id-123')
        .set('Authorization', 'Bearer mock-dev-token')
        .expect(200);

      expect(res.body.message).toContain('deleted');
    });
  });

  describe('AI Endpoints (/api/v1/ai)', () => {
    it('GET /api/v1/ai/schema - fetch sections schema layout', async () => {
      const res = await request(app)
        .get('/api/v1/ai/schema')
        .set('Authorization', 'Bearer mock-dev-token')
        .expect(200);

      expect(res.body.schema).toBeDefined();
      expect(res.body.schema.length).toBeGreaterThan(0);
    });

    it('GET /api/v1/ai/providers - list AI models/providers config', async () => {
      const res = await request(app)
        .get('/api/v1/ai/providers')
        .set('Authorization', 'Bearer mock-dev-token')
        .expect(200);

      expect(res.body.providers).toBeDefined();
      expect(res.body.providers.length).toBeGreaterThan(0);
    });

    it('GET /api/v1/ai/settings - fetch current settings', async () => {
      vi.mocked(prisma.systemConfig.findMany).mockResolvedValue([
        { key: 'active_llm_provider', value: 'openrouter', createdAt: new Date(), updatedAt: new Date() },
        { key: 'active_llm_model', value: 'qwen-2.5-7b', createdAt: new Date(), updatedAt: new Date() },
        { key: 'active_llm_language', value: 'en', createdAt: new Date(), updatedAt: new Date() }
      ]);

      const res = await request(app)
        .get('/api/v1/ai/settings')
        .set('Authorization', 'Bearer mock-dev-token')
        .expect(200);

      expect(res.body.provider).toBe('openrouter');
      expect(res.body.model).toBe('qwen-2.5-7b');
    });

    it('POST /api/v1/ai/refine-section - request refinement of a single section', async () => {
      vi.mocked(prisma.systemConfig.findMany).mockResolvedValue([
        { key: 'active_llm_provider', value: 'openrouter', createdAt: new Date(), updatedAt: new Date() },
        { key: 'active_llm_model', value: 'qwen-2.5-7b', createdAt: new Date(), updatedAt: new Date() },
        { key: 'active_llm_language', value: 'en', createdAt: new Date(), updatedAt: new Date() }
      ]);

      const payload = {
        sectionName: 'requirements',
        currentContent: 'Must know JS',
        action: 'expand',
      };

      const res = await request(app)
        .post('/api/v1/ai/refine-section')
        .set('Authorization', 'Bearer mock-dev-token')
        .send(payload)
        .expect(200);

      expect(res.body.refinedContent).toBe('Refined content from test LLM Mock');
    });

    it('POST /api/v1/ai/generate - test AI streaming output', async () => {
      vi.mocked(prisma.systemConfig.findMany).mockResolvedValue([
        { key: 'active_llm_provider', value: 'openrouter', createdAt: new Date(), updatedAt: new Date() },
        { key: 'active_llm_model', value: 'qwen-2.5-7b', createdAt: new Date(), updatedAt: new Date() },
        { key: 'active_llm_language', value: 'en', createdAt: new Date(), updatedAt: new Date() }
      ]);

      const payload = {
        prompt: 'Staff Frontend Engineer specialized in React and Vite',
        seniority: 'Lead',
        location: 'Remote',
        workType: 'Remote',
        employmentType: 'Full-time',
        tone: 'startup',
      };

      const res = await request(app)
        .post('/api/v1/ai/generate')
        .set('Authorization', 'Bearer mock-dev-token')
        .send(payload)
        .expect('Content-Type', /event-stream/)
        .expect(200);

      expect(res.text).toContain('started');
      expect(res.text).toContain('Senior Staff Architect (Test)');
      expect(res.text).toContain('Verify frontend backend streaming');
      expect(res.text).toContain('completed');
    });
  });
});
