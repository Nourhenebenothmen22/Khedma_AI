export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = {
    ...options.headers,
    'Authorization': 'Bearer mock-dev-token-khedma'
  };
  return fetch(url, { ...options, headers });
}

export interface JobDescription {
  id: string;
  title: string;
  seniority: string;
  location: string;
  workType: string;
  employmentType: string;
  language: string;
  tone: string;
  sections: Record<string, any>;
  atsKeywords: string[];
  isFavorite: boolean;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  versions?: JobDescriptionVersion[];
}

export interface JobDescriptionVersion {
  id: string;
  jobDescriptionId: string;
  versionNumber: number;
  sections: Record<string, any>;
  createdAt: string;
}

export interface JobDescriptionSectionSchema {
  id: string;
  key: string;
  labels: {
    en: string;
    fr: string;
    ar: string;
  };
  description: {
    en: string;
    fr: string;
    ar: string;
  };
  type: 'string' | 'array';
  order: number;
}

export interface LLMModelInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  contextWindow: number;
}

export interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  models: LLMModelInfo[];
}

export interface AISettings {
  provider: string;
  model: string;
  language: 'en' | 'fr' | 'ar';
}

export interface DashboardStats {
  totalGenerations: number;
  totalRefinements: number;
  activeDrafts: number;
  favoriteTemplates: number;
  totalTokensEstimated: number;
  seniorityDistribution: { seniority: string; count: number }[];
}

export interface GenerateParams {
  prompt: string;
  seniority: string;
  tone: string;
  location: string;
  workType: string;
  employmentType: string;
}

export interface RefineParams {
  sectionName: string;
  currentContent: string;
  action: 'improve' | 'expand' | 'shorten' | 'inclusive';
}

/**
 * Fetch dynamic schema layout from the backend
 */
export async function getSectionsSchema(): Promise<JobDescriptionSectionSchema[]> {
  const res = await authFetch(`${API_BASE_URL}/ai/schema`);
  if (!res.ok) throw new Error('Failed to fetch sections schema');
  const data = await res.json();
  return data.schema || [];
}

/**
 * Fetch dynamic AI providers & models list
 */
export async function getProviders(): Promise<ProviderInfo[]> {
  const res = await authFetch(`${API_BASE_URL}/ai/providers`);
  if (!res.ok) throw new Error('Failed to fetch providers configuration');
  const data = await res.json();
  return data.providers || [];
}

/**
 * Fetch active AI Settings (provider, model, target language)
 */
export async function getSettings(): Promise<AISettings> {
  const res = await authFetch(`${API_BASE_URL}/ai/settings`);
  if (!res.ok) throw new Error('Failed to fetch AI settings');
  return res.json();
}

/**
 * Update active AI Settings
 */
export async function updateSettings(settings: AISettings): Promise<AISettings> {
  const res = await authFetch(`${API_BASE_URL}/ai/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  if (!res.ok) throw new Error('Failed to save AI settings');
  const data = await res.json();
  return data.settings;
}

/**
 * Fetch list of all jobs
 */
export async function getJobs(filters?: { isFavorite?: boolean; isDraft?: boolean }): Promise<JobDescription[]> {
  const query = new URLSearchParams();
  if (filters?.isFavorite !== undefined) query.append('isFavorite', String(filters.isFavorite));
  if (filters?.isDraft !== undefined) query.append('isDraft', String(filters.isDraft));
  
  const res = await authFetch(`${API_BASE_URL}/jobs?${query}`);
  if (!res.ok) throw new Error('Failed to fetch jobs');
  const data = await res.json();
  return data.jobs || [];
}

/**
 * Fetch a single job by id
 */
export async function getJobById(id: string): Promise<JobDescription> {
  const res = await authFetch(`${API_BASE_URL}/jobs/${id}`);
  if (!res.ok) throw new Error('Failed to fetch job');
  const data = await res.json();
  return data.job;
}

/**
 * Create a new job description
 */
export async function createJob(job: Partial<JobDescription>): Promise<JobDescription> {
  const res = await authFetch(`${API_BASE_URL}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(job),
  });
  if (!res.ok) throw new Error('Failed to save job');
  const data = await res.json();
  return data.job;
}

/**
 * Update an existing job description
 */
export async function updateJob(id: string, job: Partial<JobDescription>): Promise<JobDescription> {
  const res = await authFetch(`${API_BASE_URL}/jobs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(job),
  });
  if (!res.ok) throw new Error('Failed to update job');
  const data = await res.json();
  return data.job;
}

/**
 * Delete a job description
 */
export async function deleteJob(id: string): Promise<void> {
  const res = await authFetch(`${API_BASE_URL}/jobs/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete job');
}

/**
 * Fetch dashboard stats
 */
export async function getStats(): Promise<DashboardStats> {
  const res = await authFetch(`${API_BASE_URL}/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

/**
 * Refine a specific section using AI
 */
export async function refineSection(params: RefineParams): Promise<string> {
  const res = await authFetch(`${API_BASE_URL}/ai/refine-section`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Refine request failed');
  const data = await res.json();
  return data.refinedContent;
}

/**
 * Handle streaming AI job description generation
 */
export async function generateJobStream(
  params: GenerateParams,
  onEvent: (event: { status?: string; chunk?: string; provider?: string; model?: string; language?: string; error?: string }) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await authFetch(`${API_BASE_URL}/ai/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
    signal
  });

  if (!response.ok) {
    throw new Error('AI generation request failed');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep partial line in buffer

    for (const line of lines) {
      const cleanLine = line.trim();
      if (!cleanLine) continue;

      if (cleanLine.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(cleanLine.slice(6));
          onEvent(parsed);
        } catch (e) {
          // ignore parsing error of incomplete events
        }
      }
    }
  }
}
