export type LLMProviderType = 'openrouter' | 'openai' | 'claude' | 'local';

export interface ModelInfo {
  id: string;
  name: string;
  provider: LLMProviderType;
  providerModelId: string; // The ID used in the raw API call (e.g. 'meta-llama/llama-3.1-8b-instruct')
  description: string;
  contextWindow: number;
}

export interface ProviderInfo {
  id: LLMProviderType;
  name: string;
  description: string;
  models: ModelInfo[];
}

export const PROVIDERS_CONFIG: Record<LLMProviderType, ProviderInfo> = {
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Access top open source models through a single API gateway.',
    models: [
      {
        id: 'qwen-2.5-7b',
        name: 'Qwen 2.5 7B',
        provider: 'openrouter',
        providerModelId: 'qwen/qwen-2.5-7b-instruct',
        description: 'Fast, efficient, and excellent multilingual reasoning.',
        contextWindow: 32768
      },
      {
        id: 'qwen-2.5-14b',
        name: 'Qwen 2.5 14B',
        provider: 'openrouter',
        providerModelId: 'qwen/qwen-2.5-14b-instruct',
        description: 'Strong balance between speed, cost, and high-quality detailed writing.',
        contextWindow: 32768
      },
      {
        id: 'llama-3.1-8b',
        name: 'Llama 3.1 8B',
        provider: 'openrouter',
        providerModelId: 'meta-llama/llama-3.1-8b-instruct:free',
        description: 'Meta\'s highly capable lightweight model, ideal for fast tasks.',
        contextWindow: 131072
      },
      {
        id: 'llama-3.3-70b',
        name: 'Llama 3.3 70B',
        provider: 'openrouter',
        providerModelId: 'meta-llama/llama-3.3-70b-instruct',
        description: 'Ultra-powerful model with advanced analytical capabilities and high nuance.',
        contextWindow: 131072
      },
      {
        id: 'gemma-2-9b',
        name: 'Gemma 2 9B',
        provider: 'openrouter',
        providerModelId: 'google/gemma-2-9b-it:free',
        description: 'Google\'s highly tuned open model, known for natural copywriting.',
        contextWindow: 8192
      },
      {
        id: 'mistral-small',
        name: 'Mistral Small',
        provider: 'openrouter',
        providerModelId: 'mistralai/mistral-small-24b-instruct-2501',
        description: 'Mistral\'s small but mighty multilingual powerhouse.',
        contextWindow: 32768
      }
    ]
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'Industry-standard proprietary LLMs from OpenAI.',
    models: [
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        providerModelId: 'gpt-4o-mini',
        description: 'Fast, lightweight and cost-efficient intelligent model.',
        contextWindow: 128000
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        providerModelId: 'gpt-4o',
        description: 'High-capability flagship model for complex reasoning and tasks.',
        contextWindow: 128000
      }
    ]
  },
  claude: {
    id: 'claude',
    name: 'Anthropic Claude',
    description: 'State-of-the-art models from Anthropic with advanced reasoning.',
    models: [
      {
        id: 'claude-3-5-haiku',
        name: 'Claude 3.5 Haiku',
        provider: 'claude',
        providerModelId: 'claude-3-5-haiku-20241022',
        description: 'Anthropic\'s fastest and most cost-effective model.',
        contextWindow: 200000
      },
      {
        id: 'claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'claude',
        providerModelId: 'claude-3-5-sonnet-20241022',
        description: 'Anthropic\'s most powerful model, unmatched for conceptual complexity.',
        contextWindow: 200000
      }
    ]
  },
  local: {
    id: 'local',
    name: 'Local Inference (Ollama / Llama.cpp)',
    description: 'Run open-source models completely locally on your system.',
    models: [
      {
        id: 'llama3-local',
        name: 'Llama 3 (Local)',
        provider: 'local',
        providerModelId: 'llama3',
        description: 'Ollama local execution of Llama 3 8B.',
        contextWindow: 8192
      },
      {
        id: 'qwen2.5-local',
        name: 'Qwen 2.5 (Local)',
        provider: 'local',
        providerModelId: 'qwen2.5:7b',
        description: 'Ollama local execution of Qwen 2.5 7B.',
        contextWindow: 8192
      }
    ]
  }
};

export interface GenerateOptions {
  prompt: string;
  seniority: string;
  tone: string;
  location: string;
  workType: string;
  employmentType: string;
}

export interface RefineOptions {
  sectionName: string;
  currentContent: string;
  action: 'improve' | 'expand' | 'shorten' | 'inclusive';
}

export interface LLMProvider {
  /**
   * Generates a job description as a progressive stream.
   * Expects structured JSON strings to be piped token-by-token.
   */
  generateStream(
    provider: LLMProviderType,
    modelId: string,
    options: GenerateOptions,
    language: 'en' | 'fr' | 'ar',
    sectionsSchema: JobDescriptionSectionSchema[],
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<string>;

  /**
   * Refines a specific job description section.
   */
  refine(
    provider: LLMProviderType,
    modelId: string,
    options: RefineOptions,
    language: 'en' | 'fr' | 'ar',
    signal?: AbortSignal
  ): Promise<string>;
}

// System Configurations Schemas
export interface JobDescriptionSectionSchema {
  id: string;
  key: string; // Key in the JSON payload
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
