import React, { useState } from "react";
import { Sparkles, X, Brain, CheckCircle, AlertTriangle, AlertCircle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch } from "../lib/authStore";
import { useUI } from "./UIUtilities";
import { QuestionGroup, Folder } from "../types";

interface AIQuestionGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  groupId?: string; // Pre-selected if opened from folder detail
  folderId?: string; // Pre-selected if opened from folder detail
  groupsList?: QuestionGroup[]; // For selection in global mode
  foldersList?: Folder[]; // For selection in global mode
  onImportSuccess?: () => void; // Refresh callback
}

export default function AIQuestionGenerator({
  isOpen,
  onClose,
  groupId: initialGroupId,
  folderId: initialFolderId,
  groupsList = [],
  foldersList = [],
  onImportSuccess
}: AIQuestionGeneratorProps) {
  const { toast } = useUI();
  const [rawText, setRawText] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId || "");
  const [selectedFolderId, setSelectedFolderId] = useState(initialFolderId || "");
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    createdCount: number;
    errors: string[];
    questions?: any[];
  } | null>(null);

  // Filter folders matching selected group if in global mode
  const filteredFolders = foldersList.filter(f => f.groupId === selectedGroupId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetFolder = initialFolderId || selectedFolderId;
    const targetGroup = initialGroupId || selectedGroupId;

    if (!targetFolder) {
      toast("Please select a target folder for the imported questions.", "warning");
      return;
    }
    if (!rawText.trim()) {
      toast("Please paste some curriculum notes or article text first.", "warning");
      return;
    }

    setLoading(true);
    setImportResult(null);

    try {
      const res = await apiFetch(`/api/folders/${targetFolder}/questions/import`, {
        method: "POST",
        body: JSON.stringify({ rawText, groupId: targetGroup })
      });

      const data = await res.json();
      if (res.ok) {
        setImportResult({
          success: true,
          createdCount: data.createdCount,
          errors: data.errors || [],
          questions: data.questions
        });
        toast(`Successfully generated ${data.createdCount} questions!`);
        if (onImportSuccess) onImportSuccess();
      } else {
        setImportResult({
          success: false,
          createdCount: 0,
          errors: [data.message || "An error occurred during AI processing."]
        });
        toast(data.message || "AI extraction failed.", "error");
      }
    } catch (err: any) {
      setImportResult({
        success: false,
        createdCount: 0,
        errors: [err.message || "Network request failed."]
      });
      toast("Network error. AI pipeline timed out.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-150 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={loading ? undefined : onClose} />

      {/* Modal Container */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="relative w-full max-w-2xl bg-[#131b2e] border border-white/15 rounded-3xl overflow-hidden shadow-2xl z-10 text-white"
      >
        {/* Dynamic Glowing Header */}
        <div className="ai-gradient p-6 flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-md border border-white/10">
              <Sparkles className="w-6 h-6 text-[#4cd7f6] animate-pulse" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl leading-none">Generate Questions with AI</h2>
              <p className="text-white/80 text-xs mt-1.5 font-sans">
                Convert dense notes, documents, or articles into styled interactive quizzes instantly.
              </p>
            </div>
          </div>
          <button 
            disabled={loading}
            onClick={onClose}
            className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white/95 hover:scale-105 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal content */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {!importResult && !loading && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Target Selectors (if not context-bound) */}
              {!initialFolderId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Target Question Group
                    </label>
                    <select
                      value={selectedGroupId}
                      onChange={(e) => {
                        setSelectedGroupId(e.target.value);
                        setSelectedFolderId(""); // reset folder
                      }}
                      required
                      className="w-full bg-[#1c263f] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                    >
                      <option value="">-- Choose Group --</option>
                      {groupsList.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Target Folder
                    </label>
                    <select
                      value={selectedFolderId}
                      onChange={(e) => setSelectedFolderId(e.target.value)}
                      disabled={!selectedGroupId}
                      required
                      className="w-full bg-[#1c263f] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none disabled:opacity-40"
                    >
                      <option value="">-- Select Folder --</option>
                      {filteredFolders.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Paste area */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Paste Study Material, Past Papers, or Notes
                </label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste your syllabus content, raw PDF text, textbook screenshots converted to text, flashcards, or exam guides here. Our server-side Gemini 3.5 engine will read, outline core structures, format answers, and import into your folder in a single pass..."
                  rows={8}
                  required
                  className="w-full bg-[#0b1326] border border-white/10 rounded-2xl p-4 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none font-sans text-slate-200 placeholder-slate-500 resize-y leading-relaxed"
                />
                <div className="flex justify-between items-center text-xs text-slate-400 mt-2">
                  <span>Minimum ~50 characters recommended.</span>
                  <span>{rawText.length} characters</span>
                </div>
              </div>

              {/* Submit trigger */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-4 px-6 rounded-2xl font-semibold ai-gradient text-white flex items-center justify-center gap-2 shadow-xl hover:opacity-95 transition-all text-sm uppercase tracking-wider"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Start AI Extraction</span>
                </button>
              </div>
            </form>
          )}

          {/* LOADING STATE */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full border border-indigo-500/10 flex items-center justify-center">
                  <Brain className="w-10 h-10 text-indigo-400 animate-pulse" />
                </div>
                {/* Spin border */}
                <div className="absolute inset-0 border-2 border-transparent border-t-indigo-500 border-b-[#4cd7f6] rounded-full animate-spin" />
              </div>

              <h3 className="font-display font-semibold text-lg text-white">AI is reading your content...</h3>
              <p className="text-sm text-slate-400 max-w-sm mt-2 leading-relaxed">
                Gemini is mapping standard competencies, authoring distractor choices, and structuring questions database. This takes roughly 3-5 seconds.
              </p>

              <div className="w-48 bg-slate-800 h-1.5 rounded-full overflow-hidden mt-6">
                <motion.div
                  className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full"
                  animate={{ x: [-100, 200] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  style={{ width: "80px" }}
                />
              </div>
            </div>
          )}

          {/* RESULTS STATE */}
          {importResult && (
            <div className="space-y-6">
              {importResult.success ? (
                <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-5 flex items-start gap-4">
                  <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 shrink-0">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-emerald-400 leading-none">Import Succeeded</h3>
                    <p className="text-slate-300 text-sm mt-2 leading-relaxed">
                      Generated and recorded <strong className="text-white text-base">{importResult.createdCount}</strong> fully structured questions inside the targeted database storage folder.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-5 flex items-start gap-4">
                  <div className="p-2 bg-rose-500/10 rounded-xl text-rose-400 shrink-0">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-rose-400 leading-none">Import Failed</h3>
                    <p className="text-slate-300 text-sm mt-2">
                      An error occurred during AI parsing. Please check the logs below or reformat your input text.
                    </p>
                  </div>
                </div>
              )}

              {/* WARNING BULLETINS / ERROR REPORTS */}
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Inference Logs & Bulletins</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {importResult.errors.map((err, idx) => (
                      <li key={idx} className="bg-amber-950/10 border border-amber-500/10 text-amber-300 text-xs px-3 py-2.5 rounded-xl font-mono leading-relaxed flex items-start gap-2">
                        <span className="text-amber-500 font-bold shrink-0">[Log {idx+1}]</span>
                        <span>{err}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Sample extracted preview */}
              {importResult.questions && importResult.questions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Previewing Generated Questions ({importResult.questions.length})
                  </h4>
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {importResult.questions.map((q, idx) => (
                      <div key={idx} className="bg-white/5 border border-white/5 p-3.5 rounded-xl">
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-sm font-medium text-slate-200">
                            {idx+1}. {q.text}
                          </p>
                          <span className="text-[10px] font-mono uppercase bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md text-indigo-300 shrink-0">
                            {q.points} PTS
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase">TYPE: {q.type}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Close and start again triggers */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setImportResult(null);
                    setRawText("");
                  }}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-semibold text-sm transition-all"
                >
                  Generate More Content
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 ai-gradient text-white rounded-xl font-semibold text-sm shadow-lg transition-all"
                >
                  Close Importer
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
