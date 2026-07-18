import { z } from 'zod';

export const generateSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(1000, 'Prompt must be less than 1000 characters'),
  seniority: z.enum(['Junior', 'Mid', 'Senior', 'Lead', 'Executive']).optional().default('Mid'),
  location: z.string().max(100, 'Location must be less than 100 characters').optional().default('Remote'),
  workType: z.enum(['Remote', 'Hybrid', 'Onsite']).optional().default('Remote'),
  employmentType: z.enum(['Full-time', 'Part-time', 'Contract', 'Internship']).optional().default('Full-time'),
  tone: z.enum(['professional', 'startup', 'corporate', 'enthusiastic']).optional().default('professional')
});

export const refineSchema = z.object({
  sectionName: z.string().min(1, 'sectionName is required'),
  currentContent: z.string().min(1, 'currentContent is required'),
  action: z.enum(['improve', 'expand', 'shorten', 'inclusive'])
});

export const settingsSchema = z.object({
  provider: z.enum(['openrouter', 'openai', 'claude', 'local']),
  model: z.string().min(1, 'model is required'),
  language: z.enum(['en', 'fr', 'ar'])
});

export const createJobSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  seniority: z.enum(['Junior', 'Mid', 'Senior', 'Lead', 'Executive']).optional().default('Mid'),
  location: z.string().max(100, 'Location must be less than 100 characters').optional().default('Remote'),
  workType: z.enum(['Remote', 'Hybrid', 'Onsite']).optional().default('Remote'),
  employmentType: z.enum(['Full-time', 'Part-time', 'Contract', 'Internship']).optional().default('Full-time'),
  language: z.enum(['en', 'fr', 'ar']).optional().default('en'),
  tone: z.enum(['professional', 'startup', 'corporate', 'enthusiastic']).optional().default('professional'),
  sections: z.record(z.string(), z.any()),
  atsKeywords: z.array(z.string()).optional().default([]),
  isFavorite: z.boolean().optional().default(false),
  isDraft: z.boolean().optional().default(true)
});

export const updateJobSchema = createJobSchema.partial();
