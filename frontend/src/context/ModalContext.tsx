import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export interface ConfirmModalOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
}

interface ModalContextType {
  triggerConfirm: (options: ConfirmModalOptions) => void;
  closeConfirm: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modalOptions, setModalOptions] = useState<ConfirmModalOptions | null>(null);

  const triggerConfirm = (options: ConfirmModalOptions) => {
    setModalOptions(options);
  };

  const closeConfirm = () => {
    setModalOptions(null);
  };

  const handleConfirm = () => {
    if (modalOptions?.onConfirm) {
      modalOptions.onConfirm();
    }
    closeConfirm();
  };

  return (
    <ModalContext.Provider value={{ triggerConfirm, closeConfirm }}>
      {children}
      <AnimatePresence>
        {modalOptions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4"
            >
              <h3 className="text-base font-bold text-slate-800">{modalOptions.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{modalOptions.message}</p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={closeConfirm}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  {modalOptions.cancelText || 'Cancel'}
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-colors cursor-pointer"
                >
                  {modalOptions.confirmText || 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ModalContext.Provider>
  );
};

export const useConfirmModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useConfirmModal must be used within a ModalProvider');
  }
  return context;
};
