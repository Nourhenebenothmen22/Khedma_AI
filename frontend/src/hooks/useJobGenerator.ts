import { useState, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createJob,
  updateJob,
  refineSection,
  generateJobStream
} from '../services/api.js';
import type { JobDescription, JobDescriptionSectionSchema, AISettings } from '../services/api.js';
import { parsePartialJSON } from '../utils/jsonParser.js';

interface UseJobGeneratorProps {
  sectionsSchema?: JobDescriptionSectionSchema[];
  activeSettings?: AISettings;
  jobs?: JobDescription[];
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  t: (key: string) => string;
  i18n: any;
  onQuotaExceeded?: (quota?: any) => void;
}

export function useJobGenerator({
  sectionsSchema,
  activeSettings,
  jobs,
  addToast,
  t,
  i18n,
  onQuotaExceeded
}: UseJobGeneratorProps) {
  const queryClient = useQueryClient();

  // Generator inputs
  const [prompt, setPrompt] = useState('');
  const [seniority, setSeniority] = useState('Mid');
  const [location, setLocation] = useState('');
  const [workType, setWorkType] = useState('Remote');
  const [employmentType, setEmploymentType] = useState('Full-time');
  const [tone, setTone] = useState('professional');

  // Generator Streaming / State
  const [isGenerating, setIsGenerating] = useState(false);
  const streamBufferRef = useRef('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const [generatedSections, setGeneratedSections] = useState<Record<string, any>>({});
  const [activeGeneratingModel, setActiveGeneratingModel] = useState('');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  // Edit / Refine states
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [isRefining, setIsRefining] = useState<string | null>(null);

  // Job saving mutation
  const saveJobMutation = useMutation({
    mutationFn: (job: Partial<JobDescription>) => {
      if (activeJobId) {
        return updateJob(activeJobId, job);
      } else {
        return createJob(job);
      }
    },
    onSuccess: (data) => {
      setActiveJobId(data.id);

      // Immediately update React Query Cache for instant 0ms UI update
      queryClient.setQueryData<JobDescription[]>(['jobs'], (oldJobs) => {
        if (!oldJobs) return [data];
        const exists = oldJobs.some((j) => j.id === data.id);
        if (exists) {
          return oldJobs.map((j) => (j.id === data.id ? data : j));
        }
        return [data, ...oldJobs];
      });

      queryClient.invalidateQueries({ queryKey: ['jobs'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['stats'], refetchType: 'all' });
      const msg = data.isDraft === false 
        ? (t('generator.canvas.templateSaved') || 'Template saved successfully')
        : (t('generator.canvas.saved') || 'Draft saved successfully');
      addToast(msg, 'success');
    },
    onError: (err: any) => {
      addToast(err.message || 'Failed to save job', 'error');
    }
  });

  const handleCancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    addToast('Generation cancelled', 'info');
  }, [addToast]);

  const handleSaveDraft = useCallback(() => {
    const title = generatedSections.title || prompt.trim() || 'Untitled Role';
    const jobPayload: Partial<JobDescription> = {
      title,
      seniority,
      location: location || 'Remote',
      workType,
      employmentType,
      language: activeSettings?.language || 'en',
      tone,
      sections: generatedSections,
      atsKeywords: generatedSections.atsKeywords || [],
      isDraft: true
    };
    saveJobMutation.mutate(jobPayload);
  }, [generatedSections, prompt, seniority, location, workType, employmentType, activeSettings?.language, tone, saveJobMutation]);

  const autoSaveDraft = useCallback((sections: Record<string, any>) => {
    const title = sections.title || prompt.trim() || 'Untitled Role';
    const jobPayload: Partial<JobDescription> = {
      title,
      seniority,
      location: location || 'Remote',
      workType,
      employmentType,
      language: activeSettings?.language || 'en',
      tone,
      sections: sections,
      atsKeywords: sections.atsKeywords || [],
      isDraft: true
    };
    saveJobMutation.mutate(jobPayload);
  }, [prompt, seniority, location, workType, employmentType, activeSettings?.language, tone, saveJobMutation]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || !sectionsSchema) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsGenerating(true);
    setGeneratedSections({});
    streamBufferRef.current = '';
    setActiveGeneratingModel(activeSettings?.model || 'gpt-4o-mini');

    let lastRenderTime = 0;
    let throttleTimer: any = null;
    let currentSections: Record<string, any> = {};

    try {
      await generateJobStream(
        {
          prompt,
          seniority,
          location: location || 'Remote',
          workType,
          employmentType,
          tone
        },
        (event) => {
          if (event.model) {
            setActiveGeneratingModel(event.model);
          }
          if (event.chunk) {
            streamBufferRef.current += event.chunk;
            currentSections = parsePartialJSON(streamBufferRef.current, sectionsSchema);

            const now = Date.now();
            if (now - lastRenderTime > 50) {
              lastRenderTime = now;
              setGeneratedSections(currentSections);
            } else if (!throttleTimer) {
              throttleTimer = setTimeout(() => {
                throttleTimer = null;
                lastRenderTime = Date.now();
                setGeneratedSections(currentSections);
              }, 50);
            }
          }
          if (event.status === 'completed') {
            if (throttleTimer) {
              clearTimeout(throttleTimer);
              throttleTimer = null;
            }
            setGeneratedSections(currentSections);
            setIsGenerating(false);
            queryClient.invalidateQueries({ queryKey: ['stats'] });
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
            autoSaveDraft(currentSections);
          }
          if (event.error) {
            if (throttleTimer) {
              clearTimeout(throttleTimer);
              throttleTimer = null;
            }
            addToast(`Generation failed: ${event.error}`, 'error');
            setIsGenerating(false);
          }
        },
        controller.signal
      );
    } catch (error: any) {
      if (throttleTimer) {
        clearTimeout(throttleTimer);
        throttleTimer = null;
      }
      if (error.name === 'AbortError') {
        addToast('Generation stopped', 'info');
      } else if (error.status === 429 || error.quota || (error.message && error.message.toLowerCase().includes('quota'))) {
        if (onQuotaExceeded) {
          onQuotaExceeded(error.quota);
        } else {
          addToast(error.message || 'Monthly quota exceeded. Please upgrade your plan.', 'error');
        }
      } else {
        const errorMsg = error.message || 'An error occurred during generation';
        addToast(errorMsg, 'error');
      }
      setIsGenerating(false);
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [
    prompt,
    seniority,
    location,
    workType,
    employmentType,
    tone,
    sectionsSchema,
    activeSettings?.model,
    addToast,
    autoSaveDraft,
    onQuotaExceeded,
    queryClient
  ]);

  const handleEditSection = useCallback((key: string, value: any) => {
    setEditingSection(key);
    if (Array.isArray(value)) {
      setEditValue(value.join('\n'));
    } else {
      setEditValue(value || '');
    }
  }, []);

  const handleSaveSection = useCallback((key: string) => {
    let updatedValue: any = editValue;
    const sectionSchema = sectionsSchema?.find((s) => s.key === key);

    if (sectionSchema?.type === 'array') {
      updatedValue = editValue
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    }

    const updatedSections = {
      ...generatedSections,
      [key]: updatedValue
    };

    setGeneratedSections(updatedSections);
    setEditingSection(null);

    if (activeJobId) {
      const jobPayload: Partial<JobDescription> = {
        title: updatedSections.title || prompt.trim() || 'Untitled Role',
        sections: updatedSections,
        atsKeywords: updatedSections.atsKeywords || []
      };
      saveJobMutation.mutate(jobPayload);
    }
  }, [editValue, sectionsSchema, generatedSections, activeJobId, saveJobMutation, prompt]);

  const handleRefiningAction = useCallback(async (
    key: string,
    action: 'improve' | 'expand' | 'shorten' | 'inclusive'
  ) => {
    let currentText = '';
    const sectionValue = generatedSections[key];
    const sectionSchema = sectionsSchema?.find((s) => s.key === key);

    if (Array.isArray(sectionValue)) {
      currentText = sectionValue.join('\n');
    } else {
      currentText = sectionValue || '';
    }

    if (!currentText.trim()) return;

    setIsRefining(key);

    try {
      const refined = await refineSection({
        sectionName: key,
        currentContent: currentText,
        action
      });

      let parsedRefined: any = refined;
      if (sectionSchema?.type === 'array') {
        parsedRefined = refined
          .split('\n')
          .map((line) => line.trim().replace(/^[-*•]\s*/, ''))
          .filter((line) => line.length > 0);
      }

      const updatedSections = {
        ...generatedSections,
        [key]: parsedRefined
      };

      setGeneratedSections(updatedSections);

      if (activeJobId) {
        const jobPayload: Partial<JobDescription> = {
          title: updatedSections.title || prompt.trim() || 'Untitled Role',
          sections: updatedSections,
          atsKeywords: updatedSections.atsKeywords || []
        };
        saveJobMutation.mutate(jobPayload);
      }
      addToast(t('generator.canvas.saved') || 'Section refined successfully', 'success');
    } catch (error: any) {
      addToast(`AI Refinement failed: ${error.message || error}`, 'error');
    } finally {
      setIsRefining(null);
    }
  }, [generatedSections, sectionsSchema, activeJobId, saveJobMutation, addToast, t, prompt]);

  const handleToggleFavorite = useCallback(() => {
    if (!activeJobId) return;
    const isFav = !jobs?.find((j) => j.id === activeJobId)?.isFavorite;
    saveJobMutation.mutate({ isFavorite: isFav });
  }, [activeJobId, jobs, saveJobMutation]);

  const handleSaveFinal = useCallback(() => {
    const title = generatedSections.title || prompt.trim() || 'Untitled Role';
    const jobPayload: Partial<JobDescription> = {
      title,
      seniority,
      location: location || 'Remote',
      workType,
      employmentType,
      language: activeSettings?.language || 'en',
      tone,
      sections: generatedSections,
      atsKeywords: generatedSections.atsKeywords || [],
      isDraft: false
    };
    saveJobMutation.mutate(jobPayload);
  }, [generatedSections, prompt, seniority, location, workType, employmentType, activeSettings?.language, tone, saveJobMutation]);

  const copyToClipboard = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(key);
    addToast('Copied to clipboard', 'info');
    setTimeout(() => setCopiedSection(null), 2000);
  }, [addToast]);

  const copyAllText = useCallback(() => {
    if (!generatedSections.title || !sectionsSchema) return;

    const formatSection = (title: string, val: any) => {
      if (Array.isArray(val)) {
        return `### ${title}\n${val.map((item) => `- ${item}`).join('\n')}\n\n`;
      }
      return `### ${title}\n${val}\n\n`;
    };

    let fullText = `# ${generatedSections.title}\n\n`;
    const uiLang = i18n.language as 'en' | 'fr' | 'ar';

    sectionsSchema.forEach((section) => {
      if (section.key !== 'title') {
        const labelText = section.labels[uiLang] || section.labels['en'];
        fullText += formatSection(labelText, generatedSections[section.key]);
      }
    });

    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    addToast('All content copied to clipboard', 'success');
    setTimeout(() => setCopiedAll(false), 2000);
  }, [generatedSections, sectionsSchema, i18n.language, addToast]);

  const openDraftState = useCallback((job: JobDescription) => {
    setActiveJobId(job.id);
    setPrompt(job.title);
    setSeniority(job.seniority);
    setLocation(job.location);
    setWorkType(job.workType);
    const normalizedEmp = job.employmentType === 'FullTime' ? 'Full-time' : job.employmentType === 'PartTime' ? 'Part-time' : job.employmentType;
    setEmploymentType(normalizedEmp);
    setTone(job.tone);
    setGeneratedSections(job.sections);
  }, []);

  const resetGenerator = useCallback(() => {
    setPrompt('');
    setGeneratedSections({});
    setActiveJobId(null);
    setEditingSection(null);
  }, []);

  return {
    prompt,
    setPrompt,
    seniority,
    setSeniority,
    location,
    setLocation,
    workType,
    setWorkType,
    employmentType,
    setEmploymentType,
    tone,
    setTone,
    isGenerating,
    generatedSections,
    setGeneratedSections,
    activeGeneratingModel,
    activeJobId,
    setActiveJobId,
    editingSection,
    setEditingSection,
    editValue,
    setEditValue,
    isRefining,
    copiedSection,
    copiedAll,
    handleGenerate,
    handleCancelGeneration,
    handleSaveDraft,
    handleEditSection,
    handleSaveSection,
    handleRefiningAction,
    handleToggleFavorite,
    handleSaveFinal,
    copyToClipboard,
    copyAllText,
    openDraftState,
    resetGenerator
  };
}
