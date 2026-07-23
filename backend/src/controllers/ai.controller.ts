import { Request, Response, NextFunction } from 'express';
import { OpenRouterLLMProvider } from '../services/llm.service.js';
import { configService } from '../services/config.service.js';
import { statsRepository } from '../repositories/stats.repository.js';
import { quotaService } from '../services/quota.service.js';
import { PROVIDERS_CONFIG, LLMProviderType } from '../types/llm.js';

const llmProvider = new OpenRouterLLMProvider();

export class AIController {
  getSchema = (req: Request, res: Response, next: NextFunction) => {
    const schema = configService.getSectionsSchema();
    res.json({ schema });
  };

  getProviders = (req: Request, res: Response, next: NextFunction) => {
    res.json({ providers: Object.values(PROVIDERS_CONFIG) });
  };

  getSettings = async (req: Request, res: Response, next: NextFunction) => {
    const settings = await configService.getActiveSettings();
    res.json(settings);
  };

  updateSettings = async (req: Request, res: Response, next: NextFunction) => {
    const { provider, model, language } = req.body;
    await configService.updateActiveSettings(
      provider as LLMProviderType,
      model,
      language as 'en' | 'fr' | 'ar'
    );
    res.json({ message: 'AI settings updated successfully', settings: { provider, model, language } });
  };

  upgradePlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user?.tenantId || 'dev-tenant-id';
      const { plan } = req.body;
      const targetPlan = (plan && ['FREE', 'PRO', 'ENTERPRISE'].includes(String(plan).toUpperCase()))
        ? String(plan).toUpperCase()
        : 'PRO';

      const quota = await quotaService.checkQuota(tenantId, targetPlan);
      res.json({
        success: true,
        message: `Successfully upgraded subscription to ${targetPlan} plan.`,
        plan: targetPlan,
        quota
      });
    } catch (error) {
      next(error);
    }
  };

  generate = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id || 'dev-user-id';
    const tenantId = req.user?.tenantId || 'dev-tenant-id';
    const { prompt, seniority, location, workType, employmentType, tone } = req.body;

    const abortController = new AbortController();
    req.on('close', () => {
      console.log('🔌 Client connection closed. Aborting LLM request.');
      abortController.abort();
    });

    let headersSent = false;
    try {
      // 1. Fetch active AI configs & dynamic schema
      const settings = await configService.getActiveSettings();
      const sectionsSchema = configService.getSectionsSchema();
      
      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      headersSent = true;

      // Send initial configuration details
      res.write(`data: ${JSON.stringify({ 
        status: 'started', 
        provider: settings.provider, 
        model: settings.model,
        language: settings.language 
      })}\n\n`);

      let responseBody = '';
      
      await llmProvider.generateStream(
        settings.provider,
        settings.model,
        {
          prompt,
          seniority,
          location,
          workType,
          employmentType,
          tone
        },
        settings.language,
        sectionsSchema,
        (chunk) => {
          responseBody += chunk;
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        },
        abortController.signal
      );

      // Asynchronously log usage metrics scoped by tenant & user
      statsRepository.logUsage(userId, tenantId, 'generate_full', Math.round(responseBody.length / 4));

      res.write(`data: ${JSON.stringify({ status: 'completed' })}\n\n`);
      res.end();
    } catch (error: any) {
      if (headersSent) {
        if (abortController.signal.aborted) {
          console.log('Generation request successfully aborted.');
          res.end();
          return;
        }
        console.error('Generation controller error:', error);
        res.write(`data: ${JSON.stringify({ error: error.message || 'AI generation failed' })}\n\n`);
        res.end();
      } else {
        next(error);
      }
    }
  };

  refineSection = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id || 'dev-user-id';
    const tenantId = req.user?.tenantId || 'dev-tenant-id';
    const { sectionName, currentContent, action } = req.body;
    const settings = await configService.getActiveSettings();

    const refinedContent = await llmProvider.refine(
      settings.provider,
      settings.model,
      {
        sectionName,
        currentContent,
        action
      },
      settings.language
    );

    statsRepository.logUsage(userId, tenantId, `refine_${action}`, Math.round((currentContent.length + refinedContent.length) / 4));

    res.json({ refinedContent });
  };
}

export const aiController = new AIController();
