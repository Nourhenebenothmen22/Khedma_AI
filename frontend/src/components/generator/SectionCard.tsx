import { motion } from 'framer-motion';
import { Copy, Check, Sparkles, RefreshCw } from 'lucide-react';
import type { JobDescriptionSectionSchema } from '../../services/api.js';

interface SectionCardProps {
  section: JobDescriptionSectionSchema;
  value: any;
  isRtl: boolean;
  isSectionEditing: boolean;
  isSectionRefining: boolean;
  editValue: string;
  setEditValue: (val: string) => void;
  onEdit: (key: string, val: any) => void;
  onCancel: () => void;
  onSave: (key: string) => void;
  onRefine: (key: string, action: 'improve' | 'expand' | 'shorten' | 'inclusive') => void;
  onCopy: (text: string, key: string) => void;
  copiedSection: string | null;
  t: (key: string) => string;
  uiLang: 'en' | 'fr' | 'ar';
}

export default function SectionCard({
  section,
  value,
  isRtl,
  isSectionEditing,
  isSectionRefining,
  editValue,
  setEditValue,
  onEdit,
  onCancel,
  onSave,
  onRefine,
  onCopy,
  copiedSection,
  t,
  uiLang
}: SectionCardProps) {
  const labelText = section.labels[uiLang] || section.labels['en'];

  return (
    <motion.div
      layout
      className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-3 relative overflow-hidden"
    >
      {isSectionRefining && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2">
          <RefreshCw className="animate-spin text-violet-600" size={20} />
          <span className="text-xs text-slate-500 font-medium">Refining content...</span>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <h4 className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">
          {labelText}
        </h4>

        {!isSectionEditing && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onCopy(Array.isArray(value) ? value.join('\n') : value, section.key)}
              className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
              title={t('generator.actions.copy')}
            >
              {copiedSection === section.key ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            </button>
            <button
              onClick={() => onEdit(section.key, value)}
              className="px-2.5 py-1 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              {t('generator.actions.edit')}
            </button>

            <div className="relative group">
              <button className="px-2.5 py-1 hover:bg-slate-50 rounded-lg text-xs font-semibold text-violet-600 hover:text-violet-700 flex items-center gap-1 transition-colors">
                <span>{t('generator.actions.refine')}</span>
                <Sparkles size={9} />
              </button>
              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-30 hidden group-hover:block overflow-hidden">
                <button onClick={() => onRefine(section.key, 'improve')} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-semibold text-slate-600 flex items-center gap-1.5">{t('generator.actions.improve')}</button>
                <button onClick={() => onRefine(section.key, 'expand')} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-semibold text-slate-600 flex items-center gap-1.5">{t('generator.actions.expand')}</button>
                <button onClick={() => onRefine(section.key, 'shorten')} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-semibold text-slate-600 flex items-center gap-1.5">{t('generator.actions.shorten')}</button>
                <button onClick={() => onRefine(section.key, 'inclusive')} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-semibold text-slate-600 flex items-center gap-1.5">{t('generator.actions.inclusive')}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section content display/editor */}
      {isSectionEditing ? (
        <div className="space-y-3">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-800 focus:outline-none focus:border-violet-600 focus:bg-white min-h-32 transition-colors"
          />
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={onCancel}
              className="px-3 py-1.5 rounded-lg hover:bg-slate-50 text-xs text-slate-500 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(section.key)}
              className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs text-white font-semibold cursor-pointer"
            >
              {t('generator.actions.save')}
            </button>
          </div>
        </div>
      ) : (
        <div className={`text-xs text-slate-600 leading-relaxed ${isRtl ? 'text-right' : ''}`}>
          {section.type === 'array' && Array.isArray(value) ? (
            <ul className="list-disc pl-5 space-y-1">
              {value.map((item, idx) => (
                <li key={idx} className="text-slate-600">{item}</li>
              ))}
            </ul>
          ) : (
            <p className="whitespace-pre-line text-sm">{value}</p>
          )}
        </div>
      )}
    </motion.div>
  );
}
