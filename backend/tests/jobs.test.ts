import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/db.js';

// Mock the prisma client to ensure complete database isolation
vi.mock('../src/config/db.js', () => {
  const mockPrisma = {
    jobDescription: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    descriptionVersion: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(mockPrisma)),
  };
  return {
    prisma: mockPrisma,
  };
});

describe('Jobs CRUD API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/jobs', () => {
    it('should list all jobs', async () => {
      const mockJobs = [
        {
          id: '1',
          title: 'Software Engineer',
          seniority: 'Mid',
          location: 'Remote',
          workType: 'Remote',
          employmentType: 'Full-time',
          language: 'en',
          tone: 'professional',
          sections: { summary: 'A great role' },
          atsKeywords: ['react', 'node'],
          isFavorite: false,
          isDraft: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.jobDescription.findMany).mockResolvedValue(mockJobs as any);

      const response = await request(app)
        .get('/api/v1/jobs')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.jobs).toHaveLength(1);
      expect(response.body.jobs[0].title).toBe('Software Engineer');
      expect(prisma.jobDescription.findMany).toHaveBeenCalledTimes(1);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.jobDescription.findMany).mockRejectedValue(new Error('DB Connection Error'));

      const response = await request(app)
        .get('/api/v1/jobs')
        .expect(500);

      expect(response.body.error).toContain('DB Connection Error');
    });
  });

  describe('GET /api/v1/jobs/:id', () => {
    it('should retrieve a single job by id with version history', async () => {
      const mockJob = {
        id: '1',
        title: 'Software Engineer',
        versions: [
          { id: 'v1', versionNumber: 1, sections: { summary: 'V1 summary' } }
        ]
      };

      vi.mocked(prisma.jobDescription.findUnique).mockResolvedValue(mockJob as any);

      const response = await request(app)
        .get('/api/v1/jobs/1')
        .expect(200);

      expect(response.body.job).toBeDefined();
      expect(response.body.job.id).toBe('1');
      expect(response.body.job.versions).toHaveLength(1);
      expect(prisma.jobDescription.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          versions: {
            orderBy: { versionNumber: 'desc' }
          }
        }
      });
    });

    it('should return 404 if job description not found', async () => {
      vi.mocked(prisma.jobDescription.findUnique).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/jobs/non-existent')
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });

  describe('POST /api/v1/jobs', () => {
    it('should create and save a new job description', async () => {
      const newJobInput = {
        title: 'Backend Developer',
        seniority: 'Senior',
        location: 'Tunis',
        workType: 'Remote',
        employmentType: 'Full-time',
        language: 'en',
        tone: 'professional',
        sections: { summary: 'Backend responsibilities' },
        atsKeywords: ['express', 'prisma'],
        isFavorite: false,
        isDraft: true,
      };

      const createdJob = { id: 'new-uuid', ...newJobInput };
      vi.mocked(prisma.jobDescription.create).mockResolvedValue(createdJob as any);

      const response = await request(app)
        .post('/api/v1/jobs')
        .send(newJobInput)
        .expect(201);

      expect(response.body.job).toBeDefined();
      expect(response.body.job.id).toBe('new-uuid');
      expect(prisma.jobDescription.create).toHaveBeenCalledTimes(1);
    });

    it('should fail validation with incomplete payload', async () => {
      const invalidInput = {
        title: 'Missing other fields',
      };

      const response = await request(app)
        .post('/api/v1/jobs')
        .send(invalidInput)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('PUT /api/v1/jobs/:id', () => {
    it('should update an existing job description and create a new version', async () => {
      const existingJob = {
        id: '1',
        title: 'Old Title',
        sections: { summary: 'Old summary' }
      };

      const updatedJob = {
        id: '1',
        title: 'New Title',
        sections: { summary: 'New summary' }
      };

      vi.mocked(prisma.jobDescription.findUnique).mockResolvedValue(existingJob as any);
      vi.mocked(prisma.descriptionVersion.findFirst).mockResolvedValue({ versionNumber: 1 } as any);
      vi.mocked(prisma.jobDescription.update).mockResolvedValue(updatedJob as any);

      const response = await request(app)
        .put('/api/v1/jobs/1')
        .send({
          title: 'New Title',
          sections: { summary: 'New summary' },
          seniority: 'Senior',
          location: 'Remote',
          workType: 'Remote',
          employmentType: 'Full-time'
        })
        .expect(200);

      expect(response.body.job).toBeDefined();
      expect(response.body.job.title).toBe('New Title');
      expect(prisma.jobDescription.update).toHaveBeenCalledTimes(1);
      expect(prisma.descriptionVersion.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('DELETE /api/v1/jobs/:id', () => {
    it('should delete a job description by id', async () => {
      vi.mocked(prisma.jobDescription.delete).mockResolvedValue({ id: '1' } as any);

      const response = await request(app)
        .delete('/api/v1/jobs/1')
        .expect(200);

      expect(response.body.message).toContain('successfully deleted');
      expect(prisma.jobDescription.delete).toHaveBeenCalledWith({
        where: { id: '1' }
      });
    });
  });
});
