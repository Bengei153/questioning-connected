import React, { useState, useEffect } from "react";
import { 
  ClipboardList, 
  Activity, 
  User, 
  Sparkles, 
  BrainCircuit, 
  Award, 
  Flame, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Play, 
  ArrowRight,
  Clock,
  ArrowLeft,
  X,
  ChevronRight
} from "lucide-react";
import { useUI } from "../components/UIUtilities";
import { apiFetch } from "../lib/authStore";
import { QuestionGroup, QuizAttempt, Question, StudentFolder } from "../types";

interface StudentPortalProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isQuizListOpen: boolean;
  setIsQuizListOpen: (open: boolean) => void;
}

export default function StudentPortal({ 
  currentTab, 
  setCurrentTab, 
  isQuizListOpen, 
  setIsQuizListOpen 
}: StudentPortalProps) {
  const { toast, confirm } = useUI();

  // Core States
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<QuizAttempt[]>([]);
  const [availableQuizzes, setAvailableQuizzes] = useState<StudentFolder[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile Edit fields - PATCH /api/users/me only accepts phoneNumber.
  // Email/username are read-only here; password changes go through the
  // forgot-password email flow, there's no "change password while logged in" endpoint.
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // ACTIVE QUIZ RUNNER CONTEXT
  const [activeQuiz, setActiveQuiz] = useState<any>(null); // from POST /api/quizzes/:id/start
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({}); // qId -> [optId]
  const [quizTimer, setQuizTimer] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  
  // QUIZ RESULTS PERSISTENCE
  const [quizResults, setQuizResults] = useState<any>(null);
  const [activeGroupFilter, setActiveGroupFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [currentTab]);

  const availableGroups = Array.from(
  new Map(availableQuizzes.map(f => [f.groupId, { groupId: f.groupId, groupName: f.groupName }])).values()
  );

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, historyRes, quizzesRes, meRes] = await Promise.all([
        apiFetch("/api/student/stats"),
        apiFetch("/api/student/history"),
        apiFetch("/api/student/folders"),
        apiFetch("/api/users/me")
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (historyRes.ok) setHistory(await historyRes.json());
      if (quizzesRes.ok) setAvailableQuizzes(await quizzesRes.json());
      if (meRes.ok) {
        const profile = await meRes.json();
        setEmail(profile.email);
      }
    } catch {
      toast("Error downloading student records", "error");
    } finally {
      setLoading(false);
    }
  };

  // QUIZ TRANSITION INITIATION
  const startQuizAttempt = async (folder: StudentFolder) => {
    setIsQuizListOpen(false);
    setLoading(true);
    try {
      const res = await apiFetch(`/api/quizzes/${folder.id}/start?groupId=${folder.groupId}`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setActiveQuiz(data);
        setSelectedAnswers({});
        setQuizTimer(0);
        setQuizResults(null);
        setCurrentTab("quiz-runner");
        toast(`Initiated ${folder.name}. Good luck!`);
      } else {
        const err = await res.json();
        toast(err.message || "Failed to start quiz session.", "error");
      }
    } catch {
      toast("Network error launching assessment.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Timer loop when taking a quiz
  useEffect(() => {
    let interval: any = null;
    if (activeQuiz && currentTab === "quiz-runner" && !submitting) {
      interval = setInterval(() => {
        setQuizTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeQuiz, currentTab, submitting]);

  // TOGGLE MULTI-SELECT OR MULTIPLE-CHOICE ANSWERS
  const handleAnswerChange = (questionId: string, optionId: string, isMultiSelect: boolean) => {
    setSelectedAnswers(prev => {
      const current = prev[questionId] || [];
      if (isMultiSelect) {
        if (current.includes(optionId)) {
          return { ...prev, [questionId]: current.filter(id => id !== optionId) };
        } else {
          return { ...prev, [questionId]: [...current, optionId] };
        }
      } else {
        // Multiple Choice: overwrite to single choice
        return { ...prev, [questionId]: [optionId] };
      }
    });
  };

  // SUBMIT ASSESSMENT
  const submitQuizAttempt = async () => {
    if (!activeQuiz) return;

    setSubmitting(true);
    toast("Grading submission...", "info");

    try {
      const res = await apiFetch(`/api/quizzes/${activeQuiz.attemptId}/submit`, {
        method: "POST",
        body: JSON.stringify({
          attemptId: activeQuiz.attemptId,
          answers: selectedAnswers
        })
      });

      if (res.ok) {
        const data = await res.json();
        setQuizResults(data);
        setCurrentTab("quiz-results");
        toast(`Assessment completed! Score: ${data.score}%`);
      } else {
        toast("Error registering quiz grading.", "error");
      }
    } catch {
      toast("Error submitting quiz attempt.", "error");
    } finally {
      setSubmitting(false);
      setActiveQuiz(null);
    }
  };

  // PROFILE UPDATES
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({ phoneNumber })
      });

      if (res.ok) {
        toast("Phone number updated successfully.");
        fetchDashboardData();
      } else {
        toast("Failed to update profile", "error");
      }
    } catch {
      toast("Error saving profile", "error");
    }
  };

  // Format Timer digits
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-slate-800/40 rounded-xl animate-pulse w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-28 bg-slate-800/40 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      
      {/* VIEW: DASHBOARD */}
      {currentTab === "student-dashboard" && stats && (
        <div className="space-y-8 animate-fade-in">
          
          {/* Welcome Banner */}
          <div className="p-6 md:p-8 bg-gradient-to-r from-indigo-900/40 via-[#131b2e]/60 to-cyan-950/20 rounded-3xl border border-white/10 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
            <div className="absolute top-[-30%] right-[-10%] w-[30%] h-[150%] rounded-full bg-cyan-400/5 blur-[80px] pointer-events-none" />
            <div className="space-y-1">
              <h2 className="font-display font-black text-3xl text-white">Welcome Back, Student!</h2>
              <p className="text-slate-400 text-sm">Review recommendations or launch live available examinations below.</p>
            </div>
            <button
              onClick={() => setIsQuizListOpen(true)}
              className="py-3.5 px-6 ai-gradient text-white rounded-xl text-sm font-bold shadow-xl shadow-indigo-500/10 hover:shadow-indigo-500/25 transition-all self-stretch md:self-auto uppercase tracking-wide cursor-pointer"
            >
              Take an Exam
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card rounded-2xl p-6 border border-white/5 relative overflow-hidden">
              <Award className="w-8 h-8 text-[#c3c0ff] absolute right-6 top-6 opacity-20" />
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed Quizzes</p>
              <h3 className="font-display text-4xl font-bold text-white mt-2">{stats.completedQuizzes}</h3>
              <p className="text-xs text-[#c3c0ff] mt-2 font-medium">Recorded score summaries</p>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-white/5 relative overflow-hidden">
              <BrainCircuit className="w-8 h-8 text-[#4cd7f6] absolute right-6 top-6 opacity-20" />
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Accuracy</p>
              <h3 className="font-display text-4xl font-bold text-white mt-2">{stats.averageScore}%</h3>
              <p className="text-xs text-[#4cd7f6] mt-2 font-medium">Target metric accuracy</p>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-white/5 relative overflow-hidden">
              <Flame className="w-8 h-8 text-amber-400 absolute right-6 top-6 opacity-20" />
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Learning Streak</p>
              <h3 className="font-display text-4xl font-bold text-amber-400 mt-2">{stats.activeStreak}</h3>
              <p className="text-xs text-amber-500 mt-2 font-semibold">Keep up the momentum!</p>
            </div>
          </div>

          {/* Available Quizzes & Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Recommendations */}
            <div className="lg:col-span-2 glass-card rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4">
              <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#4cd7f6]" />
                <span>Suggested Learning Paths</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(stats.suggestedTopics ?? []).map((topic: any) => (
                  <div key={topic.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-white/15 transition-all">
                    <div>
                      <span className={`inline-block px-2.5 py-0.5 rounded font-mono font-black text-[9px] mb-3 ${
                        topic.tag === "WEAK POINT" 
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                          : "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                      }`}>
                        {topic.tag}
                      </span>
                      <h4 className="font-display font-bold text-base text-white">{topic.title}</h4>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">{topic.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live quiz lists card */}
            <div className="glass-card rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-white mb-2">Available Exams</h3>
                <p className="text-slate-400 text-xs leading-relaxed">Directly launch authorized test sets prepared by your instructors.</p>
                <div className="space-y-2.5 mt-4 max-h-[160px] overflow-y-auto pr-1">
                  {availableQuizzes.map(quiz => (
                    <div key={quiz.id} className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between gap-3 hover:border-white/15 transition-colors">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{quiz.name}</p>
                        <p className="text-[10px] text-slate-500 truncate font-mono">{quiz.groupName}</p>
                      </div>
                      <button
                        onClick={() => startQuizAttempt(quiz)}
                        className="p-1.5 bg-indigo-500/15 text-[#c3c0ff] border border-indigo-500/20 rounded-lg text-xs hover:bg-indigo-600 hover:text-white transition-all shrink-0"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setIsQuizListOpen(true)}
                className="w-full bg-[#1c263f] border border-white/10 text-white font-semibold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-colors mt-4 text-center"
              >
                Inspect All Quizzes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: QUIZ ATTEMPTS HISTORY */}
      {currentTab === "student-history" && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h2 className="font-display font-black text-3xl text-white">Quiz Logbook</h2>
            <p className="text-slate-400 text-sm mt-1">Review historic assessment analytics and accuracy keys.</p>
          </div>

          <div className="bg-[#131b2e]/40 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-slate-900/40 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                  <th className="p-4 pl-6">Assessment</th>
                  <th className="p-4">Submission Date</th>
                  <th className="p-4">Final Accuracy</th>
                  <th className="p-4 text-right pr-6">Audits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-slate-300">
                {history.map(attempt => (
                  <tr key={attempt.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 pl-6">
                      <div>
                        <p className="font-semibold text-white">{attempt.groupName}</p>
                        <p className="text-xs text-slate-500">ID: {attempt.id}</p>
                      </div>
                    </td>
                    <td className="p-4 text-xs font-mono">{new Date(attempt.createdAt).toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                        attempt.score >= 80 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15" 
                          : attempt.score >= 50 
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/15" 
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/15"
                      }`}>
                        {attempt.score}% ACC
                      </span>
                    </td>
                    <td className="p-4 text-right pr-6">
                      <span className="text-xs text-slate-500 font-medium">Logged & Recorded</span>
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-slate-500 text-xs">
                      No attempts logged. Launch a quiz to see evaluations here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: PROFILE SETTINGS */}
      {currentTab === "student-profile" && (
        <div className="max-w-md mx-auto animate-fade-in">
          <div className="glass-card rounded-3xl p-8 border border-white/10 shadow-2xl space-y-6">
            <div>
              <h2 className="font-display font-black text-2xl text-white">Profile Credentials</h2>
              <p className="text-slate-400 text-xs mt-1">Review your user settings or change passwords.</p>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Email Address <span className="normal-case text-slate-500 font-normal">(read-only)</span>
                </label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none text-slate-400 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Phone Number <span className="normal-case text-slate-500 font-normal">(E.164 format)</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="+14155552671"
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 transition-colors outline-none text-white"
                />
              </div>
              <p className="text-xs text-slate-500 -mt-1">
                To change your password, sign out and use "Forgot Password" on the login screen.
              </p>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-md mt-2"
              >
                Save Profile Configuration
              </button>
            </form>
          </div>
        </div>
      )}

      {/* VIEW: IMMERSIVE ACTIVE QUIZ STAGE (RUNNER) */}
      {currentTab === "quiz-runner" && activeQuiz && (
        <div className="max-w-3xl mx-auto animate-fade-in bg-[#131b2e] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          {/* Header Bar */}
          <div className="p-6 bg-[#171f33] border-b border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-xs font-mono uppercase text-[#4cd7f6]">Ongoing Assessment Session</span>
              <h2 className="font-display font-black text-2xl text-white mt-1">{activeQuiz.groupName}</h2>
            </div>
            <div className="flex items-center gap-2.5 bg-slate-950/40 px-4.5 py-2.5 rounded-2xl border border-white/10 font-mono text-sm shrink-0">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-slate-300 font-semibold">{formatTimer(quizTimer)}</span>
            </div>
          </div>

          {/* Stages Content */}
          <div className="p-6 md:p-8 space-y-8">
            {activeQuiz.questions.map((q: any, qIdx: number) => {
              const answers = selectedAnswers[q.id] || [];
              const isMulti = q.type === "Multi-Select";

              return (
                <div key={q.id} className="space-y-4">
                  {/* Prompt */}
                  <div className="flex items-start gap-4">
                    <span className="w-7 h-7 bg-indigo-600/20 text-[#c3c0ff] border border-indigo-500/20 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {qIdx+1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[9px] font-mono font-bold bg-slate-950/40 text-slate-400 px-2 py-0.5 rounded border border-white/5 uppercase">
                          {q.type}
                        </span>
                        <span className="text-[9px] font-mono font-bold bg-slate-950/40 text-slate-400 px-2 py-0.5 rounded border border-white/5 uppercase">
                          {q.points} PTS
                        </span>
                      </div>
                      <p className="text-sm md:text-base font-semibold text-white leading-relaxed">{q.text}</p>
                    </div>
                  </div>

                  {/* Question Image if present */}
                  {q.image && (
                    <div className="max-w-md mx-auto max-h-48 overflow-hidden rounded-xl border border-white/10">
                      <img src={q.image} alt="Assessment aid chart" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Options Alternatives list */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-11">
                    {q.options.map((opt: any) => {
                      const selected = answers.includes(opt.id);
                      return (
                        <div
                          key={opt.id}
                          onClick={() => handleAnswerChange(q.id, opt.id, isMulti)}
                          className={`p-4 rounded-2xl border text-xs font-medium cursor-pointer flex items-center justify-between gap-3 select-none transition-all ${
                            selected 
                              ? "bg-indigo-600/10 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-900/10" 
                              : "bg-white/5 border-white/5 hover:bg-white/10 text-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Checkbox or radio mock indicator */}
                            <div className={`w-5 h-5 rounded flex items-center justify-center border shrink-0 transition-all ${
                              isMulti ? "rounded-md" : "rounded-full"
                            } ${
                              selected ? "bg-indigo-500 border-indigo-500 text-white" : "bg-slate-950/40 border-white/10"
                            }`}>
                              {selected && <CheckCircle2 className="w-3.5 h-3.5 font-bold" />}
                            </div>
                            <span>{opt.text}</span>
                          </div>
                          {opt.image && (
                            <div className="w-10 h-10 rounded border border-white/10 overflow-hidden shrink-0">
                              <img src={opt.image} alt="Option indicator graphic" className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Footer */}
          <div className="p-6 bg-[#171f33] border-t border-white/10 flex justify-end gap-3">
            <button
              onClick={() => {
                confirm({
                  title: "Abandon Quiz?",
                  message: "Are you sure you want to exit the live quiz session? Your answers will not be recorded.",
                  confirmText: "Quit Exam",
                  type: "danger",
                  onConfirm: () => {
                    setActiveQuiz(null);
                    setCurrentTab("student-dashboard");
                  }
                });
              }}
              className="px-5 py-2.5 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors"
            >
              Quit Exam
            </button>
            <button
              onClick={submitQuizAttempt}
              disabled={submitting}
              className="px-6 py-2.5 ai-gradient text-white rounded-xl text-sm font-bold shadow-lg uppercase tracking-wide transition-all"
            >
              {submitting ? "Evaluating..." : "Submit Answers"}
            </button>
          </div>
        </div>
      )}

      {/* VIEW: IMMERSIVE GRADED RESULTS TERMINAL */}
      {currentTab === "quiz-results" && quizResults && (
        <div className="max-w-3xl mx-auto animate-fade-in bg-[#131b2e] border border-[#d0bcff]/20 rounded-3xl overflow-hidden shadow-2xl">
          {/* Top banner */}
          <div className="p-8 bg-gradient-to-r from-indigo-950/60 to-cyan-950/40 border-b border-white/10 text-center space-y-4">
            <div className="mx-auto w-24 h-24 rounded-full bg-[#131b2e] border-4 border-indigo-500 flex items-center justify-center text-3xl font-black text-white relative">
              <span>{quizResults.score}%</span>
              {/* Spinning background glow */}
              <div className="absolute inset-0 rounded-full border-2 border-[#4cd7f6] animate-ping opacity-15" />
            </div>
            <div>
              <h2 className="font-display font-black text-2xl text-white">Evaluation Scorecard</h2>
              <p className="text-slate-400 text-xs mt-1">
                Lodge Statistics: Earned <strong className="text-white">{quizResults.earnedPoints}</strong> out of <strong className="text-white">{quizResults.totalPoints}</strong> targeted points.
              </p>
            </div>
          </div>

          {/* Graded Inventory */}
          <div className="p-6 md:p-8 space-y-8">
            {quizResults.results.map((q: any, qIdx: number) => {
              const isCorrect = q.userSelected.length === q.correctOptions.length &&
                q.correctOptions.every((val: any) => q.userSelected.includes(val));

              return (
                <div key={q.id} className="space-y-3.5">
                  <div className="flex items-start gap-3">
                    <span className={`w-6 h-6 rounded flex items-center justify-center text-white shrink-0 mt-0.5 ${
                      isCorrect ? "bg-emerald-600" : "bg-rose-600"
                    }`}>
                      {isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-white leading-relaxed">{qIdx+1}. {q.text}</p>
                    </div>
                  </div>

                  {/* Choice alternatives color markers */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-9">
                    {q.options.map((opt: any) => {
                      const wasSelected = q.userSelected.includes(opt.id);
                      const isCorrectOpt = opt.isCorrect;

                      return (
                        <div
                          key={opt.id}
                          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-3 ${
                            isCorrectOpt 
                              ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300" 
                              : wasSelected 
                              ? "bg-rose-950/30 border-rose-500/40 text-rose-300" 
                              : "bg-white/5 border-white/5 text-slate-400"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold">
                              {isCorrectOpt ? "✓" : wasSelected ? "✗" : "•"}
                            </span>
                            <span>{opt.text}</span>
                          </div>
                          <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">
                            {isCorrectOpt ? "CORRECT KEY" : wasSelected ? "CHOSEN" : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-6 bg-[#171f33] border-t border-white/10 flex justify-end">
            <button
              onClick={() => setCurrentTab("student-dashboard")}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-md transition-colors"
            >
              Exit Review
            </button>
          </div>
        </div>
      )}

      {/* MODAL: FLOATING QUIZ LIST LAUNCH SELECTOR */}
      {isQuizListOpen && (
      <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => { setIsQuizListOpen(false); setActiveGroupFilter(null); }} />
        <div className="relative w-full max-w-md bg-[#131b2e] border border-white/15 rounded-3xl overflow-hidden shadow-2xl z-10 text-white">
          <div className="p-6 border-b border-white/10 flex justify-between items-center">
            <div>
              <h3 className="font-display font-bold text-lg text-white">Select Quiz Project</h3>
              <p className="text-slate-400 text-xs mt-1">Authorized examinations in your tenant scope.</p>
            </div>
            <button onClick={() => { setIsQuizListOpen(false); setActiveGroupFilter(null); }} className="p-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-300">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-3.5 max-h-[350px] overflow-y-auto">
            {activeGroupFilter === null ? (
              <>
                {availableGroups.map(group => (
                  <div
                    key={group.groupId}
                    onClick={() => setActiveGroupFilter(group.groupId)}
                    className="p-4 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center gap-4 cursor-pointer hover:bg-white/10 hover:border-white/15 transition-all"
                  >
                    <h4 className="text-sm font-semibold text-white truncate">{group.groupName}</h4>
                    <ChevronRight className="w-5 h-5 text-indigo-400 shrink-0" />
                  </div>
                ))}
                {availableGroups.length === 0 && (
                  <p className="text-xs text-slate-500 text-center">No live examinations are registered at this moment.</p>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveGroupFilter(null)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 mb-2"
                >
                  ← Back to groups
                </button>
                {availableQuizzes
                  .filter(f => f.groupId === activeGroupFilter)
                  .map(quiz => (
                    <div
                      key={quiz.id}
                      onClick={() => startQuizAttempt(quiz)}
                      className="p-4 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center gap-4 cursor-pointer hover:bg-white/10 hover:border-white/15 transition-all"
                    >
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-white truncate">{quiz.name}</h4>
                        <p className="text-xs text-slate-400 truncate mt-1 leading-relaxed font-sans">{quiz.questionCount} questions</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-indigo-400 shrink-0" />
                    </div>
                  ))}
              </>
            )}
          </div>
        </div>
      </div>
    )}

    </div>
  );
}
