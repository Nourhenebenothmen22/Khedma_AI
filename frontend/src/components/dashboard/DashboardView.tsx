import { motion } from 'framer-motion';
import { Sparkles, Sliders, History, Bookmark, FileText, ChevronRight, Plus, ShieldCheck, Zap } from 'lucide-react';
import type { DashboardStats, JobDescription } from '../../services/api.js';

interface DashboardViewProps {
  stats?: DashboardStats;
  jobs?: JobDescription[];
  openDraft: (job: JobDescription) => void;
  setActiveTab: (tab: 'dashboard' | 'generator' | 'drafts' | 'settings') => void;
  t: (key: string) => string;
  onOpenUpgradeModal?: () => void;
}

export default function DashboardView({ stats, jobs, openDraft, setActiveTab, t, onOpenUpgradeModal }: DashboardViewProps) {
  const quota = stats?.quota;
  const currentPlan = quota?.plan || 'FREE';
  const currentUsage = quota?.currentGenerations ?? stats?.totalGenerations ?? 0;
  const limit = quota?.limit ?? 15;
  const isUnlimited = currentPlan === 'ENTERPRISE';
  const usagePercentage = isUnlimited ? 5 : Math.min(100, Math.round((currentUsage / limit) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-6 sm:space-y-8"
    >
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{t('dashboard.title')}</h2>
        <p className="text-slate-500 text-xs mt-1">{t('dashboard.subtitle')}</p>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between hover:border-violet-300 transition-all group">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">{t('dashboard.stats.total')}</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 block">{stats?.totalGenerations || 0}</span>
          </div>
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 group-hover:scale-105 transition-transform shrink-0">
            <Sparkles size={18} />
          </div>
        </div>

        <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between hover:border-indigo-300 transition-all group">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">{t('dashboard.stats.refinements')}</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 block">{stats?.totalRefinements || 0}</span>
          </div>
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform shrink-0">
            <Sliders size={18} />
          </div>
        </div>

        <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between hover:border-violet-300 transition-all group">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">{t('dashboard.stats.active')}</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 block">{stats?.activeDrafts || 0}</span>
          </div>
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 group-hover:scale-105 transition-transform shrink-0">
            <History size={18} />
          </div>
        </div>

        <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between hover:border-indigo-300 transition-all group">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">{t('dashboard.stats.favorites')}</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 block">{stats?.favoriteTemplates || 0}</span>
          </div>
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform shrink-0">
            <Bookmark size={18} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent generations list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">{t('dashboard.recentGenerations')}</h3>
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
                  className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all cursor-pointer flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 shrink-0">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">{job.title}</h4>
                      <span className="text-[11px] sm:text-xs text-slate-400 mt-0.5 block truncate">
                        {job.seniority} • {job.location} • {new Date(job.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 shrink-0" />
                </div>
              ))
            ) : (
              <div className="text-center p-8 border border-dashed border-slate-200 rounded-2xl">
                <span className="text-xs text-slate-400">{t('dashboard.noDrafts')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions & SaaS Subscription Indicator */}
        <div className="space-y-4">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">{t('dashboard.quickActions')}</h3>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => setActiveTab('generator')}
              className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-violet-500/10 hover:brightness-105 flex items-center justify-between transition-all"
            >
              <span>{t('dashboard.newJob')}</span>
              <Plus size={16} />
            </button>

            {/* SaaS Quota Indicator Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Zap size={15} className="text-violet-600" />
                  <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Subscription Quota</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                  currentPlan === 'ENTERPRISE'
                    ? 'bg-purple-100 text-purple-700'
                    : currentPlan === 'PRO'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {currentPlan} Plan
                </span>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
                  <span>Monthly Generations</span>
                  <span>{currentUsage} / {isUnlimited ? '∞' : limit}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      usagePercentage >= 90 ? 'bg-rose-500' : 'bg-violet-600'
                    }`}
                    style={{ width: `${usagePercentage}%` }}
                  ></div>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between gap-2">
                <p className="text-[11px] text-slate-500 leading-tight">
                  {currentPlan === 'FREE' ? '15 free generations/month.' : 'Monthly quota status.'}
                </p>
                <button
                  onClick={onOpenUpgradeModal}
                  className="px-2.5 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 font-extrabold text-[11px] transition-colors shrink-0"
                >
                  Upgrade Plan
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-100 text-slate-500 text-xs leading-relaxed space-y-3 shadow-sm">
              <span className="font-extrabold text-violet-600 text-xs uppercase tracking-wider block">Gateway Status</span>
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                <span className="font-medium">Supabase Database Connected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0"></div>
                <span className="font-medium">Active AI Model Switcher Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
