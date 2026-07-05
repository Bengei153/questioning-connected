import React, { useState } from "react";
import { Server, Save, CheckCircle, AlertCircle } from "lucide-react";
import {
  getLoginSystemUrl,
  getQuizApiUrl,
  setApiUrls,
  isValidHttpUrl,
} from "../lib/apiConfig";

interface ApiSettingsProps {
  onSaved?: () => void;
  /** When true, this renders as a full-page first-run setup screen rather than a settings panel. */
  isFirstRun?: boolean;
}

export default function ApiSettings({ onSaved, isFirstRun }: ApiSettingsProps) {
  const [loginSystemUrl, setLoginSystemUrl] = useState(getLoginSystemUrl());
  const [quizApiUrl, setQuizApiUrl] = useState(getQuizApiUrl());
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedLogin = loginSystemUrl.trim();
    const trimmedQuiz = quizApiUrl.trim();

    if (!isValidHttpUrl(trimmedLogin)) {
      setError("LoginSystem URL must be a valid http:// or https:// address.");
      return;
    }
    if (!isValidHttpUrl(trimmedQuiz)) {
      setError("Quiz API URL must be a valid http:// or https:// address.");
      return;
    }

    setApiUrls(trimmedLogin, trimmedQuiz);
    setSaved(true);
    setTimeout(() => {
      onSaved?.();
    }, 400);
  };

  return (
    <div
      className={
        isFirstRun
          ? "min-h-screen w-full bg-[#060e20] flex items-center justify-center p-6"
          : "w-full"
      }
    >
      <div className={isFirstRun ? "w-full max-w-lg" : "w-full max-w-lg"}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Server className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              {isFirstRun ? "Connect your backends" : "API Endpoints"}
            </h2>
            <p className="text-xs text-slate-400">
              {isFirstRun
                ? "Enter your two deployed API URLs to get started."
                : "Update where this app sends its requests."}
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5 bg-[#0f1830] border border-white/10 rounded-2xl p-6">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              LoginSystem URL
            </label>
            <input
              type="text"
              value={loginSystemUrl}
              onChange={(e) => setLoginSystemUrl(e.target.value)}
              placeholder="https://your-loginsystem.onrender.com"
              className="w-full bg-[#060e20] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Handles /api/auth, /api/organizations, /api/users
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Quiz API URL
            </label>
            <input
              type="text"
              value={quizApiUrl}
              onChange={(e) => setQuizApiUrl(e.target.value)}
              placeholder="https://your-quizsystem-api.onrender.com"
              className="w-full bg-[#060e20] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Handles everything else: question groups, folders, questions, quizzes, admin & student views
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {saved && (
            <div className="flex items-start gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2.5">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Saved. Both APIs must have CORS enabled for this app's origin, or requests will fail silently in the browser.</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-semibold text-sm rounded-lg py-2.5 hover:opacity-90 transition-opacity"
          >
            <Save className="w-4 h-4" />
            Save & Continue
          </button>
        </form>
      </div>
    </div>
  );
}
