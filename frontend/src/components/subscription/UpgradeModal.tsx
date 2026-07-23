import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Zap, Crown, Sparkles, Shield, Loader2 } from 'lucide-react';
import type { QuotaInfo } from '../../services/api.js';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  quota?: QuotaInfo;
  onUpgradeToPlan?: (plan: 'PRO' | 'ENTERPRISE') => Promise<void> | void;
}

export default function UpgradeModal({
  isOpen,
  onClose,
  quota,
  onUpgradeToPlan
}: UpgradeModalProps) {
  const [loadingPlan, setLoadingPlan] = useState<'PRO' | 'ENTERPRISE' | null>(null);

  if (!isOpen) return null;

  const currentPlan = quota?.plan || 'FREE';

  const getFormattedResetDate = () => {
    if (quota?.resetDate) {
      return new Date(quota.resetDate).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
    }
    const now = new Date();
    const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return nextMonth.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleSelectPlan = async (plan: 'PRO' | 'ENTERPRISE') => {
    if (loadingPlan) return;
    try {
      setLoadingPlan(plan);
      if (onUpgradeToPlan) {
        await onUpgradeToPlan(plan);
      }
      onClose();
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden my-auto"
        >
          {/* Top Header - Soft Blue SaaS Theme */}
          <div className="relative p-5 sm:p-8 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white flex items-center justify-between shrink-0">
            <div className="space-y-1 pr-8">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/20 text-white backdrop-blur-md">
                  Subscription Quota Exceeded
                </span>
                <span className="text-xs font-semibold text-blue-100">Resets {getFormattedResetDate()}</span>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">Upgrade Your Plan for Unlimited AI Power</h2>
              <p className="text-xs sm:text-sm text-blue-50/90 leading-relaxed hidden sm:block">
                You've reached your monthly generation cap. Upgrade to continue crafting high-converting job descriptions without interruption.
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={loadingPlan !== null}
              className="absolute top-5 right-5 sm:top-6 sm:right-6 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0 disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </div>

          {/* Pricing Grid */}
          <div className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 overflow-y-auto">
            {/* FREE TIER */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/80 border border-slate-200 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-lg">FREE</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Starter plan for individuals</p>
                  </div>
                  {currentPlan === 'FREE' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-200 text-slate-700">
                      Current
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900">$0</span>
                  <span className="text-xs font-medium text-slate-400">/ month</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-500 shrink-0" />
                    <span>15 AI generations / month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-500 shrink-0" />
                    <span>Standard AI models</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-500 shrink-0" />
                    <span>Basic export options</span>
                  </li>
                </ul>
              </div>
              <button
                disabled
                className="w-full py-2.5 px-4 rounded-xl bg-slate-200 text-slate-500 font-bold text-xs cursor-not-allowed text-center"
              >
                Current Plan
              </button>
            </div>

            {/* PRO TIER - HIGHLIGHTED SOFT BLUE */}
            <div className="relative p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-blue-50/50 to-white border-2 border-blue-600 shadow-xl shadow-blue-500/10 flex flex-col justify-between space-y-6">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm flex items-center gap-1">
                <Crown size={12} />
                <span>Most Popular</span>
              </div>

              <div className="space-y-4 pt-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-blue-900 text-lg">PRO</h3>
                    <p className="text-xs text-slate-500 mt-0.5">For active recruiters & HR leads</p>
                  </div>
                  {currentPlan === 'PRO' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-100 text-blue-700">
                      Current
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900">$29</span>
                  <span className="text-xs font-medium text-slate-400">/ month</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-center gap-2 font-medium">
                    <Sparkles size={14} className="text-blue-600 shrink-0" />
                    <span><strong>500 AI generations</strong> / month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-500 shrink-0" />
                    <span>Premium GPT-4o & Claude Sonnet</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-500 shrink-0" />
                    <span>Advanced AI Section Refinement</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-500 shrink-0" />
                    <span>ATS Keyword Optimizer</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => handleSelectPlan('PRO')}
                disabled={loadingPlan !== null}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 hover:brightness-105 transition-all text-center flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loadingPlan === 'PRO' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Zap size={14} />
                )}
                <span>{loadingPlan === 'PRO' ? 'Upgrading...' : 'Upgrade to PRO Now'}</span>
              </button>
            </div>

            {/* ENTERPRISE TIER */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/80 border border-slate-200 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-lg">ENTERPRISE</h3>
                    <p className="text-xs text-slate-500 mt-0.5">For enterprise hiring teams</p>
                  </div>
                  {currentPlan === 'ENTERPRISE' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-700">
                      Current
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900">$99</span>
                  <span className="text-xs font-medium text-slate-400">/ month</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2 font-medium text-slate-900">
                    <Check size={14} className="text-emerald-500 shrink-0" />
                    <span><strong>Unlimited AI generations</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-500 shrink-0" />
                    <span>Custom brand voice & prompts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-500 shrink-0" />
                    <span>Multi-user team management</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Shield size={14} className="text-blue-500 shrink-0" />
                    <span>Dedicated SLA & Priority Support</span>
                  </li>
                </ul>
              </div>
              <button
                onClick={() => handleSelectPlan('ENTERPRISE')}
                disabled={loadingPlan !== null}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors text-center flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loadingPlan === 'ENTERPRISE' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : null}
                <span>{loadingPlan === 'ENTERPRISE' ? 'Upgrading...' : 'Contact Sales / Upgrade'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
