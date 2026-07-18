import { describe, it, expect } from 'vitest';
import { parsePartialJSON } from '../../frontend/src/utils/jsonParser.js';
import type { JobDescriptionSectionSchema } from '../../frontend/src/services/api.js';

// Setup Mock Sections Schema similar to backend config schema
const mockSchema: JobDescriptionSectionSchema[] = [
  {
    id: 's1',
    key: 'title',
    labels: { en: 'Title', fr: 'Titre', ar: 'العنوان' },
    description: { en: '', fr: '', ar: '' },
    type: 'string',
    order: 1
  },
  {
    id: 's2',
    key: 'responsibilities',
    labels: { en: 'Responsibilities', fr: 'Responsabilités', ar: 'المهام' },
    description: { en: '', fr: '', ar: '' },
    type: 'array',
    order: 2
  },
  {
    id: 's3',
    key: 'salaryRange',
    labels: { en: 'Salary', fr: 'Salaire', ar: 'الراتب' },
    description: { en: '', fr: '', ar: '' },
    type: 'string',
    order: 3
  }
];

describe('Dynamic JSON Streaming Parser Unit Tests', () => {
  it('should parse simple complete JSON correctly', () => {
    const rawJson = `{"title": "Senior Data Scientist", "responsibilities": ["Build models", "Train data"], "salaryRange": "$120k"}`;
    const parsed = parsePartialJSON(rawJson, mockSchema);

    expect(parsed.title).toBe('Senior Data Scientist');
    expect(parsed.responsibilities).toEqual(['Build models', 'Train data']);
    expect(parsed.salaryRange).toBe('$120k');
  });

  it('should parse incomplete/partial JSON during streaming', () => {
    const rawJson = `{"title": "Senior Data Scientist", "responsibilities": ["Build models", "Tr`;
    const parsed = parsePartialJSON(rawJson, mockSchema);

    expect(parsed.title).toBe('Senior Data Scientist');
    expect(parsed.responsibilities).toEqual(['Build models', 'Tr']);
    expect(parsed.salaryRange).toBe(''); // Falls back to empty string
  });

  it('should correctly handle commas inside double-quoted string array elements (prevents fragmentation)', () => {
    const rawJson = `{"title": "Data Architect", "responsibilities": ["Build APIs using Node.js, Express, and PostgreSQL", "Design databases", "Deploy, configure, and maintain logs"], "salaryRange": "$140k"}`;
    const parsed = parsePartialJSON(rawJson, mockSchema);

    expect(parsed.responsibilities).toEqual([
      'Build APIs using Node.js, Express, and PostgreSQL',
      'Design databases',
      'Deploy, configure, and maintain logs'
    ]);
  });

  it('should handle unescaped elements and ignore empty entries', () => {
    const rawJson = `{"title": "DevOps", "responsibilities": ["Docker", "", "Kubernetes, Helm charts"]}`;
    const parsed = parsePartialJSON(rawJson, mockSchema);

    expect(parsed.responsibilities).toEqual([
      'Docker',
      'Kubernetes, Helm charts'
    ]);
  });
});
