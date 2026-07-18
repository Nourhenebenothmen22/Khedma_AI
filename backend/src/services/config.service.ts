import { prisma } from '../config/db.js';
import { LLMProviderType, JobDescriptionSectionSchema, PROVIDERS_CONFIG } from '../types/llm.js';

const PROVIDER_KEY = 'active_llm_provider';
const MODEL_KEY = 'active_llm_model';
const LANGUAGE_KEY = 'active_llm_language';

const DEFAULT_PROVIDER: LLMProviderType = 'openrouter';
const DEFAULT_MODEL = 'llama-3.1-8b';
const DEFAULT_LANGUAGE = 'en';

export class ConfigService {
  /**
   * Master Schema describing all generated job description sections.
   * Modifying this list changes what the AI generates and what the UI renders automatically.
   */
  getSectionsSchema(): JobDescriptionSectionSchema[] {
    return [
      {
        id: '1',
        key: 'title',
        labels: { en: 'Job Title', fr: 'Titre du Poste', ar: 'المسمى الوظيفي' },
        description: { en: 'A professional job title matching the parameters', fr: 'Un titre professionnel correspondant aux paramètres', ar: 'مسمى وظيفي مهني يتناسب مع المدخلات' },
        type: 'string',
        order: 1
      },
      {
        id: '2',
        key: 'summary',
        labels: { en: 'Professional Summary', fr: 'Résumé Professionnel', ar: 'الملخص المهني' },
        description: { en: 'A high-impact 3-4 sentence professional summary of the role', fr: 'Un résumé professionnel percutant de 3-4 phrases', ar: 'ملخص مهني قوي ومختصر من 3-4 جمل' },
        type: 'string',
        order: 2
      },
      {
        id: '3',
        key: 'responsibilities',
        labels: { en: 'Responsibilities', fr: 'Responsabilités', ar: 'المسؤوليات' },
        description: { en: 'At least 5 clear, actionable bullet points outlining daily tasks', fr: 'Au moins 5 points clairs décrivant les tâches quotidiennes', ar: '5 نقاط واضحة وقابلة للتنفيذ على الأقل تحدد المهام اليومية' },
        type: 'array',
        order: 3
      },
      {
        id: '4',
        key: 'requiredSkills',
        labels: { en: 'Required Skills', fr: 'Compétences Requises', ar: 'المهارات المطلوبة' },
        description: { en: 'At least 4 required hard skills, certifications, or academic criteria', fr: 'Au moins 4 compétences techniques, certifications ou critères académiques requis', ar: '4 مهارات تقنية أو شهادات أو معايير أكاديمية مطلوبة على الأقل' },
        type: 'array',
        order: 4
      },
      {
        id: '5',
        key: 'preferredSkills',
        labels: { en: 'Preferred Skills', fr: 'Compétences Souhaitées', ar: 'المهارات المفضلة' },
        description: { en: '3-4 preferred or nice-to-have qualifications', fr: '3-4 compétences souhaitables ou appréciées', ar: '3-4 مؤهلات مفضلة أو إضافية' },
        type: 'array',
        order: 5
      },
      {
        id: '6',
        key: 'techStack',
        labels: { en: 'Technical Stack', fr: 'Environnement Technique', ar: 'البيئة التقنية' },
        description: { en: 'Core programming languages, frameworks, or tools key to this position', fr: 'Langages de programmation, frameworks ou outils essentiels pour ce poste', ar: 'لغات البرمجة الأساسية أو أطر العمل أو الأدوات الهامة لهذا المنصب' },
        type: 'array',
        order: 6
      },
      {
        id: '7',
        key: 'softSkills',
        labels: { en: 'Soft Skills', fr: 'Qualités Humaines / Soft Skills', ar: 'المهارات الشخصية' },
        description: { en: '3-4 behavioral/soft skills essential for cultural fit', fr: '3-4 compétences comportementales essentielles pour la culture d\'entreprise', ar: '3-4 مهارات شخصية/سلوكية ضرورية للملاءمة الثقافية' },
        type: 'array',
        order: 7
      },
      {
        id: '8',
        key: 'salaryRange',
        labels: { en: 'Estimated Salary Range', fr: 'Fourchette Salariale Estimée', ar: 'نطاق الراتب المتوقع' },
        description: { en: 'Estimated salary range based on location and seniority', fr: 'Estimation de la fourchette de salaire basée sur le lieu et l\'expérience', ar: 'نطاق الراتب المقدر بناءً على الموقع والمستوى الوظيفي' },
        type: 'string',
        order: 8
      },
      {
        id: '9',
        key: 'interviewQuestions',
        labels: { en: 'Interview Questions', fr: 'Questions d\'entretien', ar: 'أسئلة المقابلة المقترحة' },
        description: { en: '3-4 highly tailored interview questions to ask candidates', fr: '3-4 questions d\'entretien ciblées pour évaluer les candidats', ar: '3-4 أسئلة مقابلة مخصصة للغاية لطرحها على المرشحين' },
        type: 'array',
        order: 9
      },
      {
        id: '10',
        key: 'atsKeywords',
        labels: { en: 'ATS Search Keywords', fr: 'Mots-clés de recherche ATS', ar: 'الكلمات المفتاحية لنظام ATS' },
        description: { en: 'At least 6 search terms/keywords recruiters can use to source this candidate', fr: 'Au moins 6 termes de recherche pour aider les recruteurs à sourcer le profil', ar: '6 كلمات مفتاحية على الأقل يمكن للمسؤولين استخدامها للوصول للمرشح' },
        type: 'array',
        order: 10
      }
    ];
  }

  /**
   * Retrieves active AI configurations (provider, model, language).
   */
  async getActiveSettings(): Promise<{ provider: LLMProviderType; model: string; language: 'en' | 'fr' | 'ar' }> {
    try {
      const configRows = await prisma.systemConfig.findMany({
        where: {
          key: { in: [PROVIDER_KEY, MODEL_KEY, LANGUAGE_KEY] }
        }
      });

      const providerRow = configRows.find(r => r.key === PROVIDER_KEY);
      const modelRow = configRows.find(r => r.key === MODEL_KEY);
      const langRow = configRows.find(r => r.key === LANGUAGE_KEY);

      let provider = (providerRow?.value || DEFAULT_PROVIDER) as LLMProviderType;
      let model = modelRow?.value || DEFAULT_MODEL;
      let language = (langRow?.value || DEFAULT_LANGUAGE) as 'en' | 'fr' | 'ar';

      // Validation
      if (!(provider in PROVIDERS_CONFIG)) {
        provider = DEFAULT_PROVIDER;
      }
      const providerModels = PROVIDERS_CONFIG[provider].models;
      if (!providerModels.some(m => m.id === model)) {
        model = providerModels[0]?.id || DEFAULT_MODEL;
      }

      return { provider, model, language };
    } catch (error) {
      console.warn('Database configuration retrieval failed, returning defaults:', error);
      return { provider: DEFAULT_PROVIDER, model: DEFAULT_MODEL, language: DEFAULT_LANGUAGE as 'en' | 'fr' | 'ar' };
    }
  }

  /**
   * Updates active AI settings.
   */
  async updateActiveSettings(provider: LLMProviderType, model: string, language: 'en' | 'fr' | 'ar'): Promise<void> {
    if (!(provider in PROVIDERS_CONFIG)) {
      throw new Error(`Provider ${provider} is not supported.`);
    }

    const providerModels = PROVIDERS_CONFIG[provider].models;
    if (!providerModels.some(m => m.id === model)) {
      throw new Error(`Model ${model} is not supported under provider ${provider}.`);
    }

    if (language !== 'en' && language !== 'fr' && language !== 'ar') {
      throw new Error(`Language ${language} is not supported.`);
    }

    try {
      await prisma.$transaction([
        prisma.systemConfig.upsert({
          where: { key: PROVIDER_KEY },
          update: { value: provider },
          create: { key: PROVIDER_KEY, value: provider }
        }),
        prisma.systemConfig.upsert({
          where: { key: MODEL_KEY },
          update: { value: model },
          create: { key: MODEL_KEY, value: model }
        }),
        prisma.systemConfig.upsert({
          where: { key: LANGUAGE_KEY },
          update: { value: language },
          create: { key: LANGUAGE_KEY, value: language }
        })
      ]);
    } catch (error) {
      console.error('Failed to update active settings in database:', error);
      throw error;
    }
  }
}

export const configService = new ConfigService();
