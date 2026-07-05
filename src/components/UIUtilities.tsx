import React, { createContext, useContext, useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

interface ConfirmConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
  onConfirm: () => void;
}

interface UIContextType {
  toast: (message: string, type?: Toast["type"]) => void;
  confirm: (config: ConfirmConfig) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function useUI() {
  const context = useContext(UIContext);
  if (!context) throw new Error("useUI must be used within UIProvider");
  return context;
}

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);

  const toast = (message: string, type: Toast["type"] = "success") => {
    const id = Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const confirm = (config: ConfirmConfig) => {
    setConfirmConfig(config);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <UIContext.Provider value={{ toast, confirm }}>
      {children}

      {/* TOAST SYSTEM CONTAINER */}
      <div className="fixed bottom-6 right-6 z-100 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className={`p-4 rounded-xl shadow-xl flex items-start gap-3 pointer-events-auto border backdrop-blur-xl ${
                t.type === "success"
                  ? "bg-emerald-950/90 text-emerald-200 border-emerald-500/30"
                  : t.type === "error"
                  ? "bg-rose-950/90 text-rose-200 border-rose-500/30"
                  : t.type === "warning"
                  ? "bg-amber-950/90 text-amber-200 border-amber-500/30"
                  : "bg-slate-900/90 text-slate-200 border-slate-500/30"
              }`}
              style={{ minWidth: "280px" }}
            >
              <div className="shrink-0 mt-0.5">
                {t.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {t.type === "error" && <AlertCircle className="w-5 h-5 text-rose-400" />}
                {t.type === "warning" && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                {t.type === "info" && <Info className="w-5 h-5 text-sky-400" />}
              </div>
              <div className="flex-1 text-sm font-medium">{t.message}</div>
              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 text-slate-400 hover:text-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* CONFIRMATION DIALOG MODAL */}
      <AnimatePresence>
        {confirmConfig && (
          <div className="fixed inset-0 z-90 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmConfig(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-md glass-card rounded-2xl p-6 shadow-2xl border border-white/10 overflow-hidden"
            >
              {/* Highlight bar based on type */}
              <div
                className={`absolute top-0 left-0 right-0 h-1.5 ${
                  confirmConfig.type === "danger"
                    ? "bg-gradient-to-r from-rose-500 to-red-600"
                    : confirmConfig.type === "warning"
                    ? "bg-gradient-to-r from-amber-500 to-orange-500"
                    : "bg-gradient-to-r from-indigo-500 to-cyan-500"
                }`}
              />

              <div className="flex items-start gap-4 mt-2">
                <div
                  className={`p-3 rounded-xl shrink-0 ${
                    confirmConfig.type === "danger"
                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      : confirmConfig.type === "warning"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  }`}
                >
                  {confirmConfig.type === "danger" ? (
                    <AlertCircle className="w-6 h-6" />
                  ) : confirmConfig.type === "warning" ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : (
                    <Info className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg text-white">
                    {confirmConfig.title}
                  </h3>
                  <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                    {confirmConfig.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setConfirmConfig(null)}
                  className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 text-sm font-medium transition-all"
                >
                  {confirmConfig.cancelText || "Cancel"}
                </button>
                <button
                  onClick={() => {
                    confirmConfig.onConfirm();
                    setConfirmConfig(null);
                  }}
                  className={`px-5 py-2 rounded-lg text-white text-sm font-semibold transition-all shadow-md ${
                    confirmConfig.type === "danger"
                      ? "bg-rose-600 hover:bg-rose-500 shadow-rose-900/30 hover:shadow-rose-900/40"
                      : confirmConfig.type === "warning"
                      ? "bg-amber-600 hover:bg-amber-500 shadow-amber-900/30 hover:shadow-amber-900/40"
                      : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/30 hover:shadow-indigo-900/40"
                  }`}
                >
                  {confirmConfig.confirmText || "Confirm"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </UIContext.Provider>
  );
}

// ==========================================
// SKELETON LOADER PLACEHOLDER
// ==========================================
export function Skeleton({ className }: { className?: string }) {
  return <div className={`shimmer rounded-lg ${className}`} />;
}
