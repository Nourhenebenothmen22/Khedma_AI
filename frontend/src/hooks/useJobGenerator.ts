import { useState, useRef } from 'react';
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
}

export function useJobGenerator({
  sectionsSchema,
  activeSettings,
  jobs,
  addToast,
  t,
  i18n
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
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      addToast(t('generator.canvas.saved') || 'Draft saved successfully', 'success');
    },
    onError: (err: any) => {
      addToast(err.message || 'Failed to save job draft', 'error');
    }
  });

  const handleGenerate = async () => {
    if (!prompt.trim() || !sectionsSchema) return;

    setIsGenerating(true);
    streamBufferRef.current = '';

    const initialSections: Record<string, any> = {};
    sectionsSchema.forEach((s) => {
      initialSections[s.key] = s.type === 'array' ? [] : '';
    });
    setGeneratedSections(initialSections);

    setActiveJobId(null);
    setEditingSection(null);

    let currentSections = initialSections;

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
            setGeneratedSections(currentSections);
          }
          if (event.status === 'completed') {
            setIsGenerating(false);
            autoSaveDraft(currentSections);
          }
          if (event.error) {
            addToast(`Generation failed: ${event.error}`, 'error');
            setIsGenerating(false);
          }
        }
      );
    } catch (error: any) {
      addToast(`Connection failed: ${error.message || error}`, 'error');
      setIsGenerating(false);
    }
  };

  const autoSaveDraft = (sections: Record<string, any>) => {
    if (!sections.title) return;
    const jobPayload: Partial<JobDescription> = {
      title: sections.title,
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
  };

  const handleEditSection = (key: string, value: any) => {
    setEditingSection(key);
    if (Array.isArray(value)) {
      setEditValue(value.join('\n'));
    } else {
      setEditValue(value || '');
    }
  };

  const handleSaveSection = (key: string) => {
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
        title: updatedSections.title || 'Untitled Role',
        sections: updatedSections,
        atsKeywords: updatedSections.atsKeywords || []
      };
      saveJobMutation.mutate(jobPayload);
    }
  };

  const handleRefiningAction = async (
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
          title: updatedSections.title || 'Untitled Role',
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
  };

  const handleToggleFavorite = () => {
    if (!activeJobId) return;
    const isFav = !jobs?.find((j) => j.id === activeJobId)?.isFavorite;
    saveJobMutation.mutate({ isFavorite: isFav });
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(key);
    addToast('Copied to clipboard', 'info');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const copyAllText = () => {
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
  };

  const openDraftState = (job: JobDescription) => {
    setActiveJobId(job.id);
    setPrompt(job.title);
    setSeniority(job.seniority);
    setLocation(job.location);
    setWorkType(job.workType);
    setEmploymentType(job.employmentType);
    setTone(job.tone);
    setGeneratedSections(job.sections);
  };

  const resetGenerator = () => {
    setPrompt('');
    setGeneratedSections({});
    setActiveJobId(null);
    setEditingSection(null);
  };

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
    handleEditSection,
    handleSaveSection,
    handleRefiningAction,
    handleToggleFavorite,
    copyToClipboard,
    copyAllText,
    openDraftState,
    resetGenerator
  };
}
