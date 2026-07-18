import { motion } from 'framer-motion';
import { Sparkles, Sliders, History, Bookmark, FileText, ChevronRight, Plus } from 'lucide-react';
import type { DashboardStats, JobDescription } from '../../services/api.js';

interface DashboardViewProps {
  stats?: DashboardStats;
  jobs?: JobDescription[];
  openDraft: (job: JobDescription) => void;
  setActiveTab: (tab: 'dashboard' | 'generator' | 'drafts' | 'settings') => void;
  t: (key: string) => string;
}

export default function DashboardView({ stats, jobs, openDraft, setActiveTab, t }: DashboardViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{t('dashboard.title')}</h2>
        <p className="text-slate-500 text-xs mt-1">{t('dashboard.subtitle')}</p>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm relative overflow-hidden group hover:border-violet-300 transition-all">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">{t('dashboard.stats.total')}</span>
          <span className="text-3xl font-extrabold text-slate-900 mt-2 block">{stats?.totalGenerations || 0}</span>
          <Sparkles size={40} className="absolute right-3 bottom-3 text-violet-500/5 group-hover:scale-105 transition-transform" />
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition-all">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">{t('dashboard.stats.refinements')}</span>
          <span className="text-3xl font-extrabold text-slate-900 mt-2 block">{stats?.totalRefinements || 0}</span>
          <Sliders size={40} className="absolute right-3 bottom-3 text-indigo-500/5 group-hover:scale-105 transition-transform" />
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm relative overflow-hidden group hover:border-violet-300 transition-all">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">{t('dashboard.stats.active')}</span>
          <span className="text-3xl font-extrabold text-slate-900 mt-2 block">{stats?.activeDrafts || 0}</span>
          <History size={40} className="absolute right-3 bottom-3 text-violet-500/5 group-hover:scale-105 transition-transform" />
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition-all">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">{t('dashboard.stats.favorites')}</span>
          <span className="text-3xl font-extrabold text-slate-900 mt-2 block">{stats?.favoriteTemplates || 0}</span>
          <Bookmark size={40} className="absolute right-3 bottom-3 text-indigo-500/5 group-hover:scale-105 transition-transform" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent generations list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t('dashboard.recentGenerations')}</h3>
            <button onClick={() => setActiveTab('drafts')} className="text-violet-600 hover:text-violet-700 text-xs font-bold flex items-center gap-1">
              <span>{t('dashboard.viewAll')}</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="space-y-3">
            {jobs && jobs.length > 0 ? (
              jobs.slice(0, 4).map((job) => (
                <div
                  key={job.id}
                  onClick={() => openDraft(job)}
                  className="p-4 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all cursor-pointer flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
                      <FileText size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{job.title}</h4>
                      <span className="text-xs text-slate-400 mt-1 block">
                        {job.seniority} • {job.location} • {new Date(job.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-400" />
                </div>
              ))
            ) : (
              <div className="text-center p-8 border border-dashed border-slate-200 rounded-2xl">
                <span className="text-xs text-slate-400">{t('dashboard.noDrafts')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t('dashboard.quickActions')}</h3>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => setActiveTab('generator')}
              className="p-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm shadow-md shadow-violet-500/10 hover:brightness-105 flex items-center justify-between transition-all"
            >
              <span>{t('dashboard.newJob')}</span>
              <Plus size={16} />
            </button>

            <div className="p-5 rounded-2xl bg-white border border-slate-100 text-slate-500 text-xs leading-relaxed space-y-3 shadow-sm">
              <span className="font-extrabold text-violet-600 text-xs uppercase tracking-wider block">Gateway Status</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="font-medium">Supabase Database Connected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                <span className="font-medium">Active AI Model Switcher Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
