import { useEffect, useMemo, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Languages, Save, Check, RefreshCw, XCircle, ChevronDown, Loader2, AlertTriangle } from 'lucide-react';
import type { ProviderInfo, JobDescriptionSectionSchema } from '../../services/api.js';
import { API_BASE_URL } from '../../services/api.js';

interface SettingsViewProps {
  providers?: ProviderInfo[];
  isProvidersLoading?: boolean;
  isProvidersError?: boolean;
  selectedProvider: string;
  setSelectedProvider: (provider: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  selectedAiLanguage: 'en' | 'fr' | 'ar';
  setSelectedAiLanguage: (lang: 'en' | 'fr' | 'ar') => void;
  onSaveSettings: () => void;
  isPending: boolean;
  sectionsSchema?: JobDescriptionSectionSchema[];
  t: (key: string) => string;
}

export default function SettingsView({
  providers,
  isProvidersLoading = false,
  isProvidersError = false,
  selectedProvider,
  setSelectedProvider,
  selectedModel,
  setSelectedModel,
  selectedAiLanguage,
  setSelectedAiLanguage,
  onSaveSettings,
  isPending,
  sectionsSchema,
  t
}: SettingsViewProps) {
  
  const [gatewayOnline, setGatewayOnline] = useState<boolean | null>(null);
  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const providerRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);

  // Close all dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }
      if (providerRef.current && !providerRef.current.contains(event.target as Node)) {
        setProviderDropdownOpen(false);
      }
      if (modelRef.current && !modelRef.current.contains(event.target as Node)) {
        setModelDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getLanguageInfo = (lang: 'en' | 'fr' | 'ar') => {
    switch (lang) {
      case 'fr': return { code: 'fr', label: 'French' };
      case 'ar': return { code: 'sa', label: 'العربية' };
      default: return { code: 'us', label: 'English' };
    }
  };

  // Run live network checks to replace static indicators
  useEffect(() => {
    const rootPath = API_BASE_URL.split('/api/v1')[0];
    fetch(`${rootPath}/health`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'ok') {
          setGatewayOnline(true);
        } else {
          setGatewayOnline(false);
        }
      })
      .catch(() => {
        setGatewayOnline(false);
      });
  }, []);

  // Find available models for selected provider using useMemo to eliminate reference loop
  const availableModels = useMemo(() => {
    return providers?.find(p => p.id === selectedProvider)?.models || [];
  }, [providers, selectedProvider]);

  // Update selected model when provider changes to ensure fallback
  useEffect(() => {
    if (availableModels.length > 0 && !availableModels.some(m => m.id === selectedModel)) {
      setSelectedModel(availableModels[0].id);
    }
  }, [selectedProvider, availableModels, selectedModel, setSelectedModel]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-6 max-w-4xl"
    >
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{t('settings.title')}</h2>
        <p className="text-slate-500 text-xs mt-1">{t('settings.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Form Settings inputs */}
        <div className="md:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Cpu className="text-violet-600" size={16} />
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">AI Configuration Parameters</h3>
            </div>

            {/* Provider Selector — custom dropdown */}
            <div className="space-y-1.5 relative" ref={providerRef}>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">AI Inference Provider</label>

              {isProvidersLoading ? (
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 size={13} className="animate-spin shrink-0" />
                  <span>Loading providers…</span>
                </div>
              ) : isProvidersError ? (
                <div className="w-full bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs text-red-500">
                  <AlertTriangle size={13} className="shrink-0" />
                  <span>Failed to load providers. Check backend connection.</span>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => { setProviderDropdownOpen(o => !o); setModelDropdownOpen(false); setLangDropdownOpen(false); }}
                    className={`w-full bg-slate-50 hover:bg-slate-100/50 border rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:bg-white transition-all font-semibold flex items-center justify-between gap-2 cursor-pointer shadow-sm ${
                      providerDropdownOpen ? 'border-violet-500 bg-white ring-2 ring-violet-100' : 'border-slate-200'
                    }`}
                  >
                    <span className="truncate min-w-0">
                      {providers?.find(p => p.id === selectedProvider)?.name || 'Select provider…'}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`shrink-0 text-slate-400 transition-transform duration-200 ${providerDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {providerDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 overflow-hidden max-h-56 overflow-y-auto">
                      {providers?.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { setSelectedProvider(p.id); setProviderDropdownOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-xs font-semibold flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors cursor-pointer ${
                            selectedProvider === p.id ? 'bg-violet-50/60 text-violet-700' : 'text-slate-700'
                          }`}
                        >
                          <span className="truncate">{p.name}</span>
                          {selectedProvider === p.id && <Check size={12} className="shrink-0 text-violet-600" />}
                        </button>
                      ))}
                    </div>
                  )}

                  {providers?.find(p => p.id === selectedProvider)?.description && (
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      {providers?.find(p => p.id === selectedProvider)?.description}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Model Selector — custom dropdown */}
            <div className="space-y-1.5 relative" ref={modelRef}>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Active Generation Model</label>

              {isProvidersLoading ? (
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 size={13} className="animate-spin shrink-0" />
                  <span>Loading models…</span>
                </div>
              ) : isProvidersError ? (
                <div className="w-full bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs text-red-500">
                  <AlertTriangle size={13} className="shrink-0" />
                  <span>Models unavailable.</span>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => { setModelDropdownOpen(o => !o); setProviderDropdownOpen(false); setLangDropdownOpen(false); }}
                    className={`w-full bg-slate-50 hover:bg-slate-100/50 border rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:bg-white transition-all font-semibold flex items-center justify-between gap-2 cursor-pointer shadow-sm ${
                      modelDropdownOpen ? 'border-violet-500 bg-white ring-2 ring-violet-100' : 'border-slate-200'
                    }`}
                  >
                    <span className="truncate min-w-0">
                      {availableModels.find(m => m.id === selectedModel)?.name || 'Select model…'}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`shrink-0 text-slate-400 transition-transform duration-200 ${modelDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {modelDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 overflow-hidden max-h-56 overflow-y-auto">
                      {availableModels.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => { setSelectedModel(m.id); setModelDropdownOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-xs font-semibold flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors cursor-pointer ${
                            selectedModel === m.id ? 'bg-violet-50/60 text-violet-700' : 'text-slate-700'
                          }`}
                        >
                          <span className="truncate">{m.name}</span>
                          {selectedModel === m.id && <Check size={12} className="shrink-0 text-violet-600" />}
                        </button>
                      ))}
                    </div>
                  )}

                  {availableModels.find(m => m.id === selectedModel)?.description && (
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      {availableModels.find(m => m.id === selectedModel)?.description}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* AI Target Output Language Selector Dropdown */}
            <div className="space-y-1.5 relative" ref={langRef}>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block flex items-center gap-1">
                <Languages size={12} className="text-slate-400" />
                <span>AI Generation Language Target</span>
              </label>
              
              <button
                type="button"
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-violet-600 focus:bg-white transition-all font-semibold flex items-center justify-between cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={`https://flagcdn.com/w20/${getLanguageInfo(selectedAiLanguage).code}.png`}
                    className="w-5 h-3.5 object-cover rounded shadow-sm border border-slate-200/50"
                    alt=""
                  />
                  <span>{getLanguageInfo(selectedAiLanguage).label}</span>
                </div>
                <span className="text-slate-400 text-[10px]">▼</span>
              </button>

              {langDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAiLanguage('en');
                      setLangDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-semibold flex items-center justify-between cursor-pointer ${
                      selectedAiLanguage === 'en' ? 'bg-violet-50/50 text-violet-700' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img src="https://flagcdn.com/w20/us.png" className="w-5 h-3.5 object-cover rounded shadow-sm border border-slate-200/50" alt="" />
                      <span>English</span>
                    </div>
                    {selectedAiLanguage === 'en' && <Check size={12} className="text-violet-600" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAiLanguage('fr');
                      setLangDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-semibold flex items-center justify-between cursor-pointer ${
                      selectedAiLanguage === 'fr' ? 'bg-violet-50/50 text-violet-700' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img src="https://flagcdn.com/w20/fr.png" className="w-5 h-3.5 object-cover rounded shadow-sm border border-slate-200/50" alt="" />
                      <span>French</span>
                    </div>
                    {selectedAiLanguage === 'fr' && <Check size={12} className="text-violet-600" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAiLanguage('ar');
                      setLangDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-semibold flex items-center justify-between cursor-pointer ${
                      selectedAiLanguage === 'ar' ? 'bg-violet-50/50 text-violet-700 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img src="https://flagcdn.com/w20/sa.png" className="w-5 h-3.5 object-cover rounded shadow-sm border border-slate-200/50" alt="" />
                      <span>العربية (Arabic)</span>
                    </div>
                    {selectedAiLanguage === 'ar' && <Check size={12} className="text-violet-600" />}
                  </button>
                </div>
              )}
            </div>

            {/* Save Configuration Trigger */}
            <button
              onClick={onSaveSettings}
              disabled={isPending}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl shadow-md shadow-violet-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isPending ? (
                <RefreshCw className="animate-spin" size={14} />
              ) : (
                <Save size={14} />
              )}
              <span>Save Configuration</span>
            </button>
          </div>
        </div>

        {/* Right Column: API Keys/Status Info Card */}
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-4">
            <span className="font-bold text-violet-600 text-xs uppercase tracking-wider block">Connection Integrity</span>
            
            <div className="space-y-3 text-[11px] text-slate-500">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span>Database Connectivity</span>
                {gatewayOnline === null ? (
                  <span className="text-slate-400 font-semibold flex items-center gap-1">
                    <RefreshCw size={11} className="animate-spin" />
                    <span>Checking...</span>
                  </span>
                ) : gatewayOnline ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <Check size={12} />
                    <span>Active</span>
                  </span>
                ) : (
                  <span className="text-red-500 font-bold flex items-center gap-1">
                    <XCircle size={12} />
                    <span>Offline</span>
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span>OpenRouter Gateway</span>
                {gatewayOnline === null ? (
                  <span className="text-slate-400 font-semibold flex items-center gap-1">
                    <RefreshCw size={11} className="animate-spin" />
                    <span>Checking...</span>
                  </span>
                ) : gatewayOnline ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <Check size={12} />
                    <span>Online</span>
                  </span>
                ) : (
                  <span className="text-red-500 font-bold flex items-center gap-1">
                    <XCircle size={12} />
                    <span>Offline</span>
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span>Dynamic Sections Schema</span>
                <span className="text-slate-600 font-bold">
                  {sectionsSchema?.length || 0} Areas
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 text-[10px] leading-relaxed">
            <span className="font-extrabold text-slate-500 block uppercase mb-1">Architecture Note</span>
            Active AI settings are stored directly in your Supabase PostgreSQL configuration database. The backend loads parameters on-the-fly via the decoupled provider abstraction layer.
          </div>
        </div>
      </div>
    </motion.div>
  );
}
