import { LLMProvider, LLMProviderType, GenerateOptions, RefineOptions, PROVIDERS_CONFIG, JobDescriptionSectionSchema } from '../types/llm.js';
import dotenv from 'dotenv';

dotenv.config();

export class OpenRouterLLMProvider implements LLMProvider {
  private getApiKey(provider: LLMProviderType): string {
    switch (provider) {
      case 'openai':
        return process.env.OPENAI_API_KEY || '';
      case 'claude':
        return process.env.ANTHROPIC_API_KEY || '';
      case 'local':
        return 'local-dummy-key';
      default:
        const key = process.env.OPENROUTER_API_KEY;
        if (!key || key === 'your_openrouter_api_key_here') return '';
        return key;
    }
  }

  private getBaseUrl(provider: LLMProviderType, modelId: string): string {
    const providerConfig = PROVIDERS_CONFIG[provider];
    const model = providerConfig?.models.find(m => m.id === modelId);
    
    if (provider === 'local') {
      return process.env.LOCAL_LLM_URL || 'http://localhost:11434/v1';
    }
    if (provider === 'openai') {
      return 'https://api.openai.com/v1';
    }
    if (provider === 'claude') {
      return 'https://api.anthropic.com/v1';
    }
    return 'https://openrouter.ai/api/v1';
  }

  async generateStream(
    provider: LLMProviderType,
    modelId: string,
    options: GenerateOptions,
    language: 'en' | 'fr' | 'ar',
    sectionsSchema: JobDescriptionSectionSchema[],
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    const apiKey = this.getApiKey(provider);

    // Sandbox / Simulation fallback if no key is configured
    if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
      console.log(`ℹ️ Sandbox Mode: Simulating dynamic stream for ${provider} / ${modelId}`);
      return this.runSimulatedStream(options, language, sectionsSchema, onChunk, signal);
    }

    const baseUrl = this.getBaseUrl(provider, modelId);
    const modelConfig = PROVIDERS_CONFIG[provider]?.models.find(m => m.id === modelId);
    const rawModelId = modelConfig?.providerModelId || modelId;

    const systemPrompt = this.buildSystemPrompt(language, sectionsSchema);
    const userPrompt = this.buildUserPrompt(options, language, sectionsSchema);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (provider === 'openrouter') {
      headers['Authorization'] = `Bearer ${apiKey}`;
      headers['HTTP-Referer'] = 'http://localhost:5000';
      headers['X-Title'] = 'AI Job Description Generator';
    } else if (provider === 'openai') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (provider === 'claude') {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
    }

    // Anthropic Claude uses a slightly different completion body structure
    const isClaudeDirect = provider === 'claude';
    const requestBody = isClaudeDirect 
      ? {
          model: rawModelId,
          max_tokens: 4000,
          messages: [{ role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }],
          stream: true
        }
      : {
          model: rawModelId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          stream: true,
          response_format: { type: 'json_object' }
        };

    try {
      const endpoint = isClaudeDirect ? `${baseUrl}/messages` : `${baseUrl}/chat/completions`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM provider error: ${response.statusText} (${response.status}) - ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder('utf-8');
      let fullText = '';
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
          if (cleanLine === 'data: [DONE]') continue;

          if (cleanLine.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(cleanLine.slice(6));
              
              // Handle differences in stream event JSON keys across providers
              let chunkText = '';
              if (isClaudeDirect) {
                chunkText = parsed.delta?.text || '';
              } else {
                chunkText = parsed.choices?.[0]?.delta?.content || '';
              }

              if (chunkText) {
                fullText += chunkText;
                onChunk(chunkText);
              }
            } catch (e) {
              // Ignore line parsing errors of incomplete SSE chunks
            }
          }
        }
      }

      return fullText;
    } catch (error) {
      console.error('Streaming error in OpenRouterLLMProvider:', error);
      throw error;
    }
  }

  async refine(
    provider: LLMProviderType,
    modelId: string,
    options: RefineOptions,
    language: 'en' | 'fr' | 'ar',
    signal?: AbortSignal
  ): Promise<string> {
    const apiKey = this.getApiKey(provider);

    if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
      return `[SIMULATED] Refined text for dynamic section ${options.sectionName} in ${language}:
${options.currentContent}
* Enhanced clarity, modern SaaS tone, and professional inclusive rules successfully applied.`;
    }

    const baseUrl = this.getBaseUrl(provider, modelId);
    const modelConfig = PROVIDERS_CONFIG[provider]?.models.find(m => m.id === modelId);
    const rawModelId = modelConfig?.providerModelId || modelId;

    const systemPrompt = `You are an expert HR copywriter. Modify the provided job description section content based on the requested instruction. 
Return ONLY the modified content inside a clean markdown format or plaintext. 
Do not include explanations, opening notes, or closing notes. Focus strictly on the exact text for the section.`;

    const userPrompt = `Section Name: ${options.sectionName}
Current Content:
${options.currentContent}

Requested Action: ${options.action.toUpperCase()}
Target Language: ${language}

Modify the content accordingly:`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (provider === 'openrouter') {
      headers['Authorization'] = `Bearer ${apiKey}`;
      headers['HTTP-Referer'] = 'http://localhost:5000';
      headers['X-Title'] = 'AI Job Description Generator';
    } else if (provider === 'openai') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const requestBody = {
      model: rawModelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      stream: false
    };

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM provider error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as any;
      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      console.error('Refinement error in OpenRouterLLMProvider:', error);
      throw error;
    }
  }

  /**
   * Generates dynamic mock output structured as JSON to feed the frontend parser.
   * Completely maps backend sections schema dynamically so no keys are hardcoded.
   */
  private async runSimulatedStream(
    options: GenerateOptions,
    language: 'en' | 'fr' | 'ar',
    sectionsSchema: JobDescriptionSectionSchema[],
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    const isAr = language === 'ar';
    const isFr = language === 'fr';
    const title = options.prompt || 'Senior SaaS Specialist';

    const mockOutput: Record<string, any> = {};

    for (const section of sectionsSchema) {
      if (section.type === 'string') {
        if (section.key === 'title') {
          mockOutput[section.key] = title;
        } else if (section.key === 'salaryRange') {
          mockOutput[section.key] = isAr ? '٧٥,٠٠٠ - ٩٥,٠٠٠ دولار سنويًا' : isFr ? '70 000 € - 90 000 €' : '$130,000 - $160,000 / year';
        } else {
          mockOutput[section.key] = isAr 
            ? `هذا ملخص تفصيلي للدور الوظيفي كـ ${title}. نحن نتطلع إلى توظيف مرشح بارز ومستعد للمساهمة في بيئة عمل سريعة النمو.`
            : isFr
            ? `Voici un résumé détaillé du poste de ${title}. Nous recherchons un candidat passionné prêt à relever des défis dans un environnement de croissance.`
            : `This is a comprehensive summary of the ${title} role. We are seeking a dedicated contributor to join our collaborative engineering operations.`;
        }
      } else {
        // Array lists
        if (section.key === 'techStack') {
          mockOutput[section.key] = ['TypeScript', 'Node.js', 'React 19', 'Tailwind CSS', 'PostgreSQL', 'Docker', 'GraphQL'];
        } else if (section.key === 'atsKeywords') {
          mockOutput[section.key] = [title, 'SaaS Architecture', 'Full Stack', 'Engineering', 'Vite', 'TypeScript Development'];
        } else {
          mockOutput[section.key] = isAr
            ? [
                `المهام الأساسية المتعلقة بـ ${section.labels.ar}`,
                'القدرة على حل المشكلات التقنية وتوثيق العمل البرمجي',
                'المشاركة في الاجتماعات الأسبوعية وتصميم البنية الهيكلية',
                'التعاون المستمر مع المهندسين والمصممين لتسليم الميزات',
                'تحسين الأداء والكفاءة العامة لنظم العمل'
              ]
            : isFr
            ? [
                `Tâche principale liée à la section ${section.labels.fr}`,
                'Résolution de problèmes techniques complexes et rédaction de documentation',
                'Participation active aux revues de code et réunions d\'équipe',
                'Collaboration continue avec les ingénieurs pour le déploiement',
                'Optimisation des performances et amélioration continue'
              ]
            : [
                `Primary objective related to ${section.labels.en}`,
                'Debug complex runtime errors and write clear developer documentation',
                'Participate in team planning meetings and code review syncs',
                'Collaborate closely with product designers and engineers',
                'Analyze performance metrics and refactor bottlenecks'
              ];
        }
      }
    }

    const jsonString = JSON.stringify(mockOutput, null, 2);
    const chunkSize = 25;
    let index = 0;

    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        if (signal?.aborted) {
          clearInterval(interval);
          reject(new Error('Generation aborted by user'));
          return;
        }
        const chunk = jsonString.slice(index, index + chunkSize);
        onChunk(chunk);
        index += chunkSize;

        if (index >= jsonString.length) {
          clearInterval(interval);
          resolve(jsonString);
        }
      }, 25);
    });
  }

  private buildSystemPrompt(language: 'en' | 'fr' | 'ar', sectionsSchema: JobDescriptionSectionSchema[]): string {
    const languageDirectives = {
      en: 'The output MUST be written in professional US English.',
      fr: 'The output MUST be written in professional French (Français).',
      ar: 'The output MUST be written in professional Arabic (العربية) using a corporate formal tone. Ensure proper RTL phrasing.'
    };

    return `You are an elite talent acquisition expert and HR copywriter. Your goal is to write high-quality, inclusive, and ATS-optimized job descriptions.
Strictly adhere to these requirements:
1. Diversity and Inclusion: Use gender-neutral phrasing (e.g. they/them, or language-specific equivalents). Avoid ageist phrasing (e.g. "young dynamic team", "digital native").
2. Language: ${languageDirectives[language]}
3. You MUST respond with a single, valid JSON object containing exactly the requested keys. Avoid any extra commentary outside the JSON object.`;
  }

  private buildUserPrompt(options: GenerateOptions, language: 'en' | 'fr' | 'ar', sectionsSchema: JobDescriptionSectionSchema[]): string {
    const jsonStructure: Record<string, string> = {};
    for (const section of sectionsSchema) {
      const descriptionText = section.description[language] || section.description['en'];
      const typeText = section.type === 'array' ? 'An array of strings: ' : 'A string: ';
      jsonStructure[section.key] = `${typeText}${descriptionText}`;
    }

    return `Generate a comprehensive job description based on these details:
- Role details requested: "${options.prompt}"
- Seniority Level: "${options.seniority}"
- Location: "${options.location}"
- Work Type: "${options.workType}"
- Employment Type: "${options.employmentType}"

You must respond with a JSON object that strictly adheres to the following structure:
${JSON.stringify(jsonStructure, null, 2)}

Ensure all JSON keys and values are double-quoted properly. No markdown fences around the JSON. Just return the raw JSON object.`;
  }
}
