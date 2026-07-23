import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  LayoutDashboard,
  Settings,
  History,
  Sparkles,
  Check
} from 'lucide-react';
import {
  getJobs,
  deleteJob,
  getProviders,
  getSettings,
  getSectionsSchema,
  getStats,
  updateSettings,
  upgradePlan
} from './services/api.js';
import UpgradeModal from './components/subscription/UpgradeModal.js';
import type { JobDescription, AISettings, JobDescriptionSectionSchema, ProviderInfo, QuotaInfo, DashboardStats } from './services/api.js';

// Modular View Components Imports
import DashboardView from './components/dashboard/DashboardView.js';
import DraftsView from './components/drafts/DraftsView.js';
import SettingsView from './components/settings/SettingsView.js';
import GeneratorView from './components/generator/GeneratorView.js';

// Custom Hook & Context Imports
import { useJobGenerator } from './hooks/useJobGenerator.js';
import { ToastProvider, useToast } from './context/ToastContext.js';
import { ModalProvider, useConfirmModal } from './context/ModalContext.js';

const getLanguageInfo = (lang: string) => {
  if (!lang) return { code: 'us', label: 'English' };
  const baseLang = lang.split('-')[0].toLowerCase();
  switch (baseLang) {
    case 'fr': return { code: 'fr', label: 'French' };
    case 'ar': return { code: 'sa', label: 'العربية' };
    default: return { code: 'us', label: 'English' };
  }
};

function MainApp() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { triggerConfirm } = useConfirmModal();

  const langInfo = getLanguageInfo(i18n.language);

  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<'dashboard' | 'generator' | 'drafts' | 'settings'>('dashboard');
  const [langOpen, setLangOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeQuotaData, setUpgradeQuotaData] = useState<QuotaInfo | undefined>(undefined);
  const langRef = useRef<HTMLDivElement>(null);

  // Close language popup on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Enforce light mode on initialization
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark');
  }, []);

  // Queries
  const { data: sectionsSchema } = useQuery<JobDescriptionSectionSchema[]>({
    queryKey: ['sectionsSchema'],
    queryFn: getSectionsSchema
  });

  const { data: providers } = useQuery<ProviderInfo[]>({
    queryKey: ['providers'],
    queryFn: getProviders
  });

  const { data: activeSettings } = useQuery<AISettings>({
    queryKey: ['aiSettings'],
    queryFn: getSettings
  });

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats
  });

  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => getJobs()
  });

  // Settings states bound to local inputs
  const [selectedProvider, setSelectedProvider] = useState('openrouter');
  const [selectedModel, setSelectedModel] = useState('llama-3.1-8b');
  const [selectedAiLanguage, setSelectedAiLanguage] = useState<'en' | 'fr' | 'ar'>('en');

  useEffect(() => {
    if (activeSettings) {
      setSelectedProvider(activeSettings.provider);
      setSelectedModel(activeSettings.model);
      setSelectedAiLanguage(activeSettings.language);
    }
  }, [activeSettings]);

  const [isPending, setIsPending] = useState(false);

  // Settings updating handler
  const handleSaveSettings = useCallback(async () => {
    setIsPending(true);
    try {
      await updateSettings({
        provider: selectedProvider,
        model: selectedModel,
        language: selectedAiLanguage
      });
      queryClient.invalidateQueries({ queryKey: ['aiSettings'] });
      addToast(t('settings.changeSuccess') || 'AI settings updated successfully', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setIsPending(false);
    }
  }, [selectedProvider, selectedModel, selectedAiLanguage, queryClient, addToast, t]);

  const deleteJobMutation = useMutation({
    mutationFn: deleteJob,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['jobs'] });
      await queryClient.cancelQueries({ queryKey: ['stats'] });

      const previousJobs = queryClient.getQueryData<JobDescription[]>(['jobs']);
      const previousStats = queryClient.getQueryData<DashboardStats>(['stats']);

      if (previousJobs) {
        queryClient.setQueryData<JobDescription[]>(['jobs'], previousJobs.filter((j) => j.id !== id));
      }

      if (previousStats) {
        const deletedJob = previousJobs?.find((j) => j.id === id);
        queryClient.setQueryData<DashboardStats>(['stats'], {
          ...previousStats,
          activeDrafts: deletedJob?.isDraft ? Math.max(0, previousStats.activeDrafts - 1) : previousStats.activeDrafts,
          favoriteTemplates: deletedJob?.isDraft === false ? Math.max(0, previousStats.favoriteTemplates - 1) : previousStats.favoriteTemplates
        });
      }

      return { previousJobs, previousStats };
    },
    onError: (err: any, _id, context) => {
      if (context?.previousJobs) queryClient.setQueryData(['jobs'], context.previousJobs);
      if (context?.previousStats) queryClient.setQueryData(['stats'], context.previousStats);
      addToast(err.message || 'Failed to delete job', 'error');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['stats'], refetchType: 'all' });
    },
    onSuccess: () => {
      addToast(t('generator.canvas.deleted') || 'Draft deleted successfully', 'success');
    }
  });

  const triggerPrint = useCallback(() => {
    window.print();
  }, []);

  const handleQuotaExceeded = useCallback((quota?: QuotaInfo) => {
    setUpgradeQuotaData(quota || stats?.quota);
    setIsUpgradeModalOpen(true);
  }, [stats?.quota]);

  const handleUpgradeToPlan = useCallback(async (plan: 'PRO' | 'ENTERPRISE') => {
    try {
      const result = await upgradePlan(plan);
      queryClient.invalidateQueries({ queryKey: ['stats'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['jobs'], refetchType: 'all' });
      const limitLabel = plan === 'ENTERPRISE' ? 'Unlimited' : '500 generations/month';
      addToast(`Successfully upgraded subscription to ${result.plan || plan} Plan! Limit is now ${limitLabel}.`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Subscription upgrade failed', 'error');
    }
  }, [queryClient, addToast]);

  // Consume extracted custom hook for job generation
  const generator = useJobGenerator({
    sectionsSchema,
    activeSettings,
    jobs,
    addToast,
    t,
    i18n,
    onQuotaExceeded: handleQuotaExceeded
  });

  const { openDraftState, resetGenerator } = generator;

  const handleOpenDraft = useCallback((job: JobDescription) => {
    openDraftState(job);
    setActiveTab('generator');
  }, [openDraftState]);

  const handleResetGenerator = useCallback(() => {
    resetGenerator();
    setActiveTab('generator');
  }, [resetGenerator]);

  const changeLanguage = useCallback((lang: string) => {
    i18n.changeLanguage(lang);
    setLangOpen(false);
  }, [i18n]);

  const isRtl = i18n.language === 'ar';
  const uiLang = i18n.language as 'en' | 'fr' | 'ar';

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen flex flex-col bg-slate-50/50 text-slate-800 antialiased transition-all duration-150">
      
      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full bg-white/85 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-6 py-4 print:hidden">
        <div className="flex items-center gap-3">
          <img
            src="/Khedma_logo.png"
            className="h-10 w-10 object-contain rounded-full shadow-md border border-slate-200 bg-white p-0.5"
            alt="Khedma AI Logo"
          />
          <div>
            <h1 className="text-xl font-extrabold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent leading-none">
              Khedma AI
            </h1>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase leading-none">Recruitment Builder</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {activeSettings && providers && (
            <div className="hidden md:flex items-center gap-2 bg-slate-100 border border-slate-200/50 rounded-full px-3 py-1 text-[11px] text-slate-600 font-medium">
              <Sparkles size={11} className="text-violet-500 animate-pulse" />
              <span>
                {providers.find(p => p.id === activeSettings.provider)?.name} •{' '}
                {providers.flatMap(p => p.models).find(m => m.id === activeSettings.model)?.name}
              </span>
            </div>
          )}

          <div className="relative" ref={langRef}>
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-2.5 bg-white hover:bg-slate-50 px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 shadow-sm text-slate-700 transition-colors cursor-pointer"
            >
              <img src={`https://flagcdn.com/w20/${langInfo.code}.png`} className="w-5 h-3.5 object-cover rounded shadow-sm border border-slate-200/50" alt="" />
              <span>{langInfo.label}</span>
              <span className="text-[9px] text-slate-400">▼</span>
            </button>
            {langOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 overflow-hidden">
                <button
                  onClick={() => changeLanguage('en')}
                  className={`w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-semibold flex items-center justify-between cursor-pointer ${
                    i18n.language.startsWith('en') ? 'bg-violet-50/50 text-violet-700' : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <img src="https://flagcdn.com/w20/us.png" className="w-5 h-3.5 object-cover rounded shadow-sm border border-slate-200/50" alt="" />
                    <span>English</span>
                  </div>
                  {i18n.language.startsWith('en') && <Check size={12} className="text-violet-600" />}
                </button>
                <button
                  onClick={() => changeLanguage('fr')}
                  className={`w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-semibold flex items-center justify-between cursor-pointer ${
                    i18n.language.startsWith('fr') ? 'bg-violet-50/50 text-violet-700' : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <img src="https://flagcdn.com/w20/fr.png" className="w-5 h-3.5 object-cover rounded shadow-sm border border-slate-200/50" alt="" />
                    <span>French</span>
                  </div>
                  {i18n.language.startsWith('fr') && <Check size={12} className="text-violet-600" />}
                </button>
                <button
                  onClick={() => changeLanguage('ar')}
                  className={`w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-semibold flex items-center justify-between cursor-pointer ${
                    i18n.language.startsWith('ar') ? 'bg-violet-50/50 text-violet-700 font-bold' : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <img src="https://flagcdn.com/w20/sa.png" className="w-5 h-3.5 object-cover rounded shadow-sm border border-slate-200/50" alt="" />
                    <span>العربية (Arabic)</span>
                  </div>
                  {i18n.language.startsWith('ar') && <Check size={12} className="text-violet-600" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* CORE LAYOUT DISPLAY */}
      <div className="flex flex-1 relative">
        
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-64 bg-white border-r border-slate-100 hidden md:flex flex-col justify-between py-6 print:hidden">
          <nav className="space-y-1.5 px-4">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-violet-50 text-violet-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <LayoutDashboard size={16} />
              <span>{t('nav.dashboard')}</span>
            </button>

            <button
              onClick={handleResetGenerator}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'generator' && !generator.activeJobId
                  ? 'bg-violet-50 text-violet-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Briefcase size={16} />
              <span>{t('nav.generator')}</span>
            </button>

            <button
              onClick={() => setActiveTab('drafts')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'drafts'
                  ? 'bg-violet-50 text-violet-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <History size={16} />
              <span>{t('nav.drafts')}</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'settings'
                  ? 'bg-violet-50 text-violet-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Settings size={16} />
              <span>{t('nav.settings')}</span>
            </button>
          </nav>

          <div className="mx-4 p-4 rounded-2xl bg-gradient-to-tr from-slate-50 to-violet-50/30 border border-slate-100 text-center">
            <span className="text-xs text-violet-600 font-extrabold uppercase tracking-widest block mb-1">Dynamic Schema</span>
            <p className="text-[11px] text-slate-500 leading-normal">Configure models, parameters, and languages from the database settings page.</p>
          </div>
        </aside>

        {/* MAIN DISPLAY CANVAS */}
        <main className="flex-1 overflow-y-auto px-8 py-8 print:p-0 print:overflow-visible">
          <AnimatePresence mode="wait">
            
            {activeTab === 'dashboard' && (
              <DashboardView
                key="dashboard"
                stats={stats}
                jobs={jobs}
                openDraft={handleOpenDraft}
                setActiveTab={setActiveTab}
                t={t}
                onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
              />
            )}

            {activeTab === 'generator' && (
              <GeneratorView
                key="generator"
                prompt={generator.prompt}
                setPrompt={generator.setPrompt}
                seniority={generator.seniority}
                setSeniority={generator.setSeniority}
                location={generator.location}
                setLocation={generator.setLocation}
                workType={generator.workType}
                setWorkType={generator.setWorkType}
                employmentType={generator.employmentType}
                setEmploymentType={generator.setEmploymentType}
                tone={generator.tone}
                setTone={generator.setTone}
                isGenerating={generator.isGenerating}
                generatedSections={generator.generatedSections}
                sectionsSchema={sectionsSchema}
                providers={providers}
                activeGeneratingModel={generator.activeGeneratingModel}
                copiedAll={generator.copiedAll}
                copyAllText={generator.copyAllText}
                triggerPrint={triggerPrint}
                activeJobId={generator.activeJobId}
                handleToggleFavorite={generator.handleToggleFavorite}
                jobs={jobs}
                editingSection={generator.editingSection}
                setEditingSection={generator.setEditingSection}
                editValue={generator.editValue}
                setEditValue={generator.setEditValue}
                isRefining={generator.isRefining}
                handleEditSection={generator.handleEditSection}
                handleSaveSection={generator.handleSaveSection}
                handleRefiningAction={generator.handleRefiningAction}
                copyToClipboard={generator.copyToClipboard}
                copiedSection={generator.copiedSection}
                onGenerate={generator.handleGenerate}
                onCancelGeneration={generator.handleCancelGeneration}
                onSaveDraft={generator.handleSaveDraft}
                onSaveFinal={generator.handleSaveFinal}
                t={t}
                uiLang={uiLang}
                isRtl={isRtl}
              />
            )}

            {activeTab === 'drafts' && (
              <DraftsView
                key="drafts"
                jobs={jobs}
                openDraft={handleOpenDraft}
                onDeleteJob={(id) => {
                  triggerConfirm({
                    title: 'Delete Draft?',
                    message: 'Are you sure you want to permanently delete this job template? This action is irreversible.',
                    confirmText: 'Delete',
                    onConfirm: () => deleteJobMutation.mutate(id)
                  });
                }}
                t={t}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                key="settings"
                providers={providers}
                selectedProvider={selectedProvider}
                setSelectedProvider={setSelectedProvider}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                selectedAiLanguage={selectedAiLanguage}
                setSelectedAiLanguage={setSelectedAiLanguage}
                onSaveSettings={handleSaveSettings}
                isPending={isPending}
                sectionsSchema={sectionsSchema}
                t={t}
              />
            )}

          </AnimatePresence>
        </main>
      </div>

      {/* FOOTER */}
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-100 mt-auto bg-white font-semibold print:hidden">
        &copy; {new Date().getFullYear()} Khedma AI. Built for HR professionals. Pure light theme.
      </footer>

      {/* SAAS UPGRADE MODAL */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        quota={upgradeQuotaData || stats?.quota}
        onUpgradeToPlan={handleUpgradeToPlan}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ModalProvider>
        <MainApp />
      </ModalProvider>
    </ToastProvider>
  );
}
