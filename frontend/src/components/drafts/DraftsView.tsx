import { motion } from 'framer-motion';
import { Trash2, FileText } from 'lucide-react';
import type { JobDescription } from '../../services/api.js';

interface DraftsViewProps {
  jobs?: JobDescription[];
  openDraft: (job: JobDescription) => void;
  onDeleteJob: (id: string) => void;
  t: (key: string) => string;
}

export default function DraftsView({ jobs, openDraft, onDeleteJob, t }: DraftsViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{t('nav.drafts')}</h2>
        <p className="text-slate-500 text-xs mt-1">Manage and edit your saved drafts and template variations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs && jobs.length > 0 ? (
          jobs.map((job) => (
            <div
              key={job.id}
              className="p-5 rounded-2xl bg-white border border-slate-100 flex flex-col justify-between hover:border-violet-300 transition-all cursor-pointer group shadow-sm"
            >
              <div onClick={() => openDraft(job)}>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full text-violet-700 font-bold uppercase">
                    {job.seniority}
                  </span>
                  <span className="text-[10px] text-slate-400">{new Date(job.updatedAt).toLocaleDateString()}</span>
                </div>
                <h3 className="font-bold text-slate-800 text-sm mt-3 group-hover:text-violet-700 transition-colors">{job.title}</h3>
                <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                  {job.sections.summary || 'No summary generated yet.'}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 mt-4 pt-3">
                <span className="text-[10px] text-slate-400">{job.location} • {job.workType}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this draft permanently?')) {
                      onDeleteJob(job.id);
                    }
                  }}
                  className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-20 border border-dashed border-slate-200 bg-white rounded-2xl shadow-sm">
            <FileText size={40} className="mx-auto text-slate-300" />
            <p className="text-slate-400 text-xs mt-3">{t('dashboard.noDrafts')}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
