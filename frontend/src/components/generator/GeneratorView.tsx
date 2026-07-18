import { Sliders, RefreshCw, Sparkles, Copy, Check, Printer, Star } from 'lucide-react';
import type { JobDescriptionSectionSchema, ProviderInfo, JobDescription } from '../../services/api.js';
import SectionCard from './SectionCard.js';

interface GeneratorViewProps {
  prompt: string;
  setPrompt: (p: string) => void;
  seniority: string;
  setSeniority: (s: string) => void;
  location: string;
  setLocation: (l: string) => void;
  workType: string;
  setWorkType: (w: string) => void;
  employmentType: string;
  setEmploymentType: (e: string) => void;
  tone: string;
  setTone: (t: string) => void;
  isGenerating: boolean;
  generatedSections: Record<string, any>;
  sectionsSchema?: JobDescriptionSectionSchema[];
  providers?: ProviderInfo[];
  activeGeneratingModel: string;
  copiedAll: boolean;
  copyAllText: () => void;
  triggerPrint: () => void;
  activeJobId: string | null;
  handleToggleFavorite: () => void;
  jobs?: JobDescription[];
  editingSection: string | null;
  setEditingSection: (key: string | null) => void;
  editValue: string;
  setEditValue: (v: string) => void;
  isRefining: string | null;
  handleEditSection: (key: string, val: any) => void;
  handleSaveSection: (key: string) => void;
  handleRefiningAction: (key: string, action: 'improve' | 'expand' | 'shorten' | 'inclusive') => void;
  copyToClipboard: (text: string, key: string) => void;
  copiedSection: string | null;
  onGenerate: () => void;
  t: (key: string) => string;
  uiLang: 'en' | 'fr' | 'ar';
  isRtl: boolean;
}

export default function GeneratorView({
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
  sectionsSchema,
  providers,
  activeGeneratingModel,
  copiedAll,
  copyAllText,
  triggerPrint,
  activeJobId,
  handleToggleFavorite,
  jobs,
  editingSection,
  setEditingSection,
  editValue,
  setEditValue,
  isRefining,
  handleEditSection,
  handleSaveSection,
  handleRefiningAction,
  copyToClipboard,
  copiedSection,
  onGenerate,
  t,
  uiLang,
  isRtl
}: GeneratorViewProps) {
  
  const hasContent = generatedSections.title || Object.keys(generatedSections).some(k => generatedSections[k]?.length > 0);
  const currentJob = jobs?.find(j => j.id === activeJobId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left config form panel */}
      <div className="lg:col-span-4 space-y-6">
        <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Sliders className="text-violet-600" size={16} />
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Configure Role</h3>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">{t('generator.form.promptLabel')}</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t('generator.form.promptPlaceholder')}
              className={`w-full bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-violet-600 focus:bg-white placeholder:text-slate-400 resize-none h-24 transition-colors ${isRtl ? 'text-right' : ''}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">{t('generator.form.seniority')}</label>
              <select
                value={seniority}
                onChange={(e) => setSeniority(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-violet-600 focus:bg-white transition-colors"
              >
                <option value="Junior">Junior</option>
                <option value="Mid">Mid</option>
                <option value="Senior">Senior</option>
                <option value="Lead">Lead</option>
                <option value="Executive">Executive</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">{t('generator.form.location')}</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Remote, Paris"
                className="w-full bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-violet-600 focus:bg-white placeholder:text-slate-400 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">{t('generator.form.workType')}</label>
              <select
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-violet-600 focus:bg-white transition-colors"
              >
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Onsite">On-site</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">{t('generator.form.employmentType')}</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-violet-600 focus:bg-white transition-colors"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">{t('generator.form.tone')}</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-violet-600 focus:bg-white transition-colors"
            >
              <option value="professional">Professional</option>
              <option value="startup">Startup / Casual</option>
              <option value="corporate">Corporate / Formal</option>
              <option value="enthusiastic">Enthusiastic</option>
            </select>
          </div>

          <button
            onClick={onGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl shadow-md shadow-violet-500/10 hover:brightness-105 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="animate-spin" size={14} />
                <span>{t('generator.form.generating')}</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>{t('generator.form.generate')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right streaming output panels */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Action row */}
        <div className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center justify-between flex-wrap gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">{t('generator.canvas.title')}</h3>
            {activeGeneratingModel && isGenerating && providers && (
              <span className="text-[10px] bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full text-violet-700 font-semibold">
                AI: {providers.flatMap(p => p.models).find(m => m.id === activeGeneratingModel)?.name || activeGeneratingModel}
              </span>
            )}
          </div>

          {generatedSections.title && (
            <div className="flex items-center gap-2">
              <button
                onClick={copyAllText}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 flex items-center gap-1.5 transition-colors"
              >
                {copiedAll ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                <span>{copiedAll ? t('generator.canvas.copied') : t('generator.canvas.copyAll')}</span>
              </button>
              <button
                onClick={triggerPrint}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 flex items-center gap-1.5 transition-colors"
              >
                <Printer size={12} />
                <span>{t('generator.canvas.exportPdf')}</span>
              </button>
              {activeJobId && (
                <button
                  onClick={handleToggleFavorite}
                  className={`px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    currentJob?.isFavorite ? 'text-amber-500' : 'text-slate-600'
                  }`}
                >
                  <Star size={12} fill={currentJob?.isFavorite ? 'currentColor' : 'none'} />
                  <span>{t('generator.canvas.favorite')}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Canvas Section Cards list */}
        <div className="space-y-4">
          {sectionsSchema && hasContent ? (
            sectionsSchema.map((section) => {
              const value = generatedSections[section.key];
              if (!value || (Array.isArray(value) && value.length === 0)) return null;

              return (
                <SectionCard
                  key={section.key}
                  section={section}
                  value={value}
                  isRtl={isRtl}
                  isSectionEditing={editingSection === section.key}
                  isSectionRefining={isRefining === section.key}
                  editValue={editValue}
                  setEditValue={setEditValue}
                  onEdit={handleEditSection}
                  onCancel={() => setEditingSection(null)}
                  onSave={handleSaveSection}
                  onRefine={handleRefiningAction}
                  onCopy={copyToClipboard}
                  copiedSection={copiedSection}
                  t={t}
                  uiLang={uiLang}
                />
              );
            })
          ) : (
            <div className="text-center py-20 border border-dashed border-slate-200 bg-white rounded-2xl flex flex-col items-center justify-center gap-3 shadow-sm">
              <Sparkles size={32} className="text-violet-600/30 animate-pulse" />
              <p className="text-slate-400 text-xs max-w-sm">{t('generator.canvas.empty')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
