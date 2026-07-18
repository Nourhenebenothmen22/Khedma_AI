import { describe, it, expect } from 'vitest';
import { generateSchema, refineSchema, settingsSchema, createJobSchema } from '../src/middleware/schemas.js';

describe('Zod Validation Schema Unit Tests', () => {
  describe('generateSchema validations', () => {
    it('should pass valid generate inputs', () => {
      const valid = {
        prompt: 'React Engineer specialized in TailwindCSS',
        seniority: 'Senior',
        location: 'Paris, France',
        workType: 'Hybrid',
        employmentType: 'Full-time',
        tone: 'startup'
      };
      const result = generateSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should fail if prompt is missing or empty', () => {
      const invalid = {
        seniority: 'Senior'
      };
      const result = generateSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should fail if invalid seniority option is provided', () => {
      const invalid = {
        prompt: 'Engineer',
        seniority: 'GodLevel'
      };
      const result = generateSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('refineSchema validations', () => {
    it('should pass correct refine instructions', () => {
      const valid = {
        sectionName: 'requirements',
        currentContent: 'Write database queries',
        action: 'expand'
      };
      const result = refineSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should fail with invalid action keys', () => {
      const invalid = {
        sectionName: 'requirements',
        currentContent: 'Write database queries',
        action: 'translate' // Not supported
      };
      const result = refineSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('settingsSchema validations', () => {
    it('should enforce supported AI languages and providers', () => {
      const valid = {
        provider: 'openrouter',
        model: 'llama-3.1-8b',
        language: 'ar'
      };
      const result = settingsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid language codes', () => {
      const invalid = {
        provider: 'openrouter',
        model: 'llama-3.1-8b',
        language: 'es' // Spanish is not configured in MVP language list
      };
      const result = settingsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('createJobSchema validations', () => {
    it('should validate complete job definitions', () => {
      const valid = {
        title: 'Solutions Architect',
        sections: { summary: 'Architect modern SaaS structures' },
        seniority: 'Lead',
        location: 'Remote',
        workType: 'Remote',
        employmentType: 'Full-time'
      };
      const result = createJobSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject if title or sections are missing', () => {
      const invalid = {
        seniority: 'Mid'
      };
      const result = createJobSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
