import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Backend Integration Tests', () => {
  describe('GET /health', () => {
    it('should return 200 OK and health status info', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.status).toBe('ok');
      expect(response.body.message).toContain('Backend is running');
    });
  });
});
