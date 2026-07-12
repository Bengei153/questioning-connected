import React, { useState, useEffect } from "react";
import { 
  Users, 
  Database, 
  FolderIcon, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Sparkles, 
  Image, 
  HelpCircle, 
  Check, 
  X, 
  ChevronRight, 
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  ClipboardList
} from "lucide-react";
import { useUI } from "../components/UIUtilities";
import { apiFetch } from "../lib/authStore";
import { QuestionGroup, Folder, Question, Option, UserProfile } from "../types";
import { extractErrorMessage } from "../lib/apiError";

interface OrgAdminPortalProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openAiModalWithTarget: (groupId: string, folderId: string) => void;
  lastImportTime: number; // Used to trigger reload
}

export default function OrgAdminPortal({ 
  currentTab, 
  setCurrentTab, 
  openAiModalWithTarget,
  lastImportTime
}: OrgAdminPortalProps) {
  const { toast, confirm } = useUI();

  // Selected contexts for drill-down views
  const [activeGroup, setActiveGroup] = useState<QuestionGroup | null>(null);
  const [activeFolder, setActiveFolder] = useState<Folder | null>(null);

  // Lists
  const [stats, setStats] = useState<any>(null);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<QuestionGroup[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Search filters
  const [studentSearch, setStudentSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");

  // Modals / Drawers State
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [studentUser, setStudentUser] = useState("");
  const [studentPhoneNumber, setStudentPhoneNumber] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPass, setStudentPass] = useState("");

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderDesc, setFolderDesc] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);

  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [qText, setQText] = useState("");
  const [qType, setQType] = useState<"SingleChoice" | "MultipleChoice">("SingleChoice");
  const [qPoints, setQPoints] = useState(10);
  const [editingQId, setEditingQId] = useState<string | null>(null);

  const [newOptionText, setNewOptionText] = useState("");
  const [newOptionIsCorrect, setNewOptionIsCorrect] = useState(false);

  // Manual answers logger state
  const [showManualLogger, setShowManualLogger] = useState(false);
  const [manualQId, setManualQId] = useState("");
  const [manualOptId, setManualOptId] = useState("");
  const [manualTextVal, setManualTextVal] = useState("");

  useEffect(() => {
    fetchData();
  }, [currentTab]);

  // If an AI import succeeds, refresh questions
  useEffect(() => {
    if (activeFolder && currentTab === "folder-questions") {
      fetchQuestions(activeFolder.id);
    }
  }, [lastImportTime]);

  const fetchData = async () => {
  setLoading(true);
  try {
    const [usersRes, groupsRes] = await Promise.all([
      apiFetch("/api/users"),
      apiFetch("/api/questiongroup")
    ]);

    let studentList: UserProfile[] = [];
    if (usersRes.ok) {
      studentList = (await usersRes.json()).filter((u: UserProfile) => u.role === "Student");
      setStudents(studentList);
    }

    let groupList: QuestionGroup[] = [];
    if (groupsRes.ok) {
      groupList = await groupsRes.json();
      setGroups(groupList);
    }

    // Real counts derived from the two calls above - /api/org/stats never existed.
    setStats({
      studentCount: studentList.length,
      groupCount: groupList.length
    });
  } catch {
    toast("Error downloading tenant context", "error");
  } finally {
    setLoading(false);
  }
  };

  const fetchFolders = async (groupId: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/question-groups/${groupId}/folders`);
      if (res.ok) {
        setFolders(await res.json());
      }
    } catch {
      toast("Error fetching folders", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async (folderId: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/folders/${folderId}/questions`);
      if (res.ok) {
        setQuestions(await res.json());
      }
    } catch {
      toast("Error loading questions", "error");
    } finally {
      setLoading(false);
    }
  };

  // STUDENTS CRUD
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentEmail || !studentPass || !studentPhoneNumber) {
      toast("Please complete all registration fields", "warning");
      return;
    }

    try {
      // organizationId is deliberately NOT sent here - the backend reads it
      // from this Org Admin's own token, so a student can only ever be
      // created inside the caller's own organization.
      const res = await apiFetch("/api/users/students", {
        method: "POST",
        body: JSON.stringify({
          username: studentUser || undefined,
          email: studentEmail,
          password: studentPass,
          phoneNumber: studentPhoneNumber
        })
      });

      if (res.ok) {
        toast("Student registered - they'll need to verify their email before they can log in.");
        setShowStudentModal(false);
        setStudentUser("");
        setStudentPhoneNumber("");
        setStudentEmail("");
        setStudentPass("");
        fetchData();
      } else {
        const errorMessage = await extractErrorMessage(res, "Failed to register student");
        toast(errorMessage, "error");
      }
    } catch {
      toast("Error connecting to user manager", "error");
    }
  };

  const handleDisableStudent = (student: UserProfile) => {
    confirm({
      title: "Deactivate Student?",
      message: `Deactivate account for ${student.username}? They will be blocked from signing in or taking quizzes.`,
      confirmText: "Deactivate",
      type: "danger",
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/users/${student.id}/disable`, { method: "PATCH" });
          if (res.ok) {
            toast("Student account suspended.");
            fetchData();
          }
        } catch {
          toast("Error disabling account", "error");
        }
      }
    });
  };

  const handleResetStudentPassword = (student: UserProfile) => {
    confirm({
      title: "Trigger Student Password Reset?",
      message: `Send credential reset code to ${student.email}?`,
      confirmText: "Generate Code",
      type: "warning",
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/users/${student.id}/reset-password`, { method: "POST" });
          if (res.ok) {
            toast("Reset code triggered.");
          } else {
            const errorMessage = await extractErrorMessage(res, "Error sending reset");
            toast(errorMessage, "error");
          }
        } catch {
          toast("Error sending reset", "error");
        }
      }
    });
  };

  // GROUPS CRUD
  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    try {
      const url = editingGroupId ? `/api/questiongroup/${editingGroupId}` : "/api/questiongroup";
      const method = editingGroupId ? "PUT" : "POST";
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({ name: groupName, description: groupDesc })
      });

      if (res.ok) {
        toast(editingGroupId ? "Question group modified" : "New Question group provisioned");
        setShowGroupModal(false);
        setGroupName("");
        setGroupDesc("");
        setEditingGroupId(null);
        fetchData();
      }
    } catch {
      toast("Error recording group details", "error");
    }
  };

  const handleToggleGroupStatus = async (group: QuestionGroup) => {
    const nextStatus = group.status === "Live" ? "Draft" : "Live";
    try {
      const res = await apiFetch(`/api/questiongroup/${group.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        toast(`Question Group status updated to ${nextStatus}`);
        fetchData();
      }
    } catch {
      toast("Error toggling status", "error");
    }
  };

  const handleDeleteGroup = (group: QuestionGroup) => {
    confirm({
      title: "Delete Question Group?",
      message: `Are you sure you want to permanently delete "${group.name}"? This removes all nested folders, questions, and option metrics automatically.`,
      confirmText: "Purge Group",
      type: "danger",
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/questiongroup/${group.id}`, { method: "DELETE" });
          if (res.ok) {
            toast("Group purged.");
            fetchData();
          }
        } catch {
          toast("Error deleting group", "error");
        }
      }
    });
  };

  // FOLDERS CRUD
  const handleSaveFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !folderName.trim()) return;

    try {
      const url = editingFolderId 
        ? `/api/question-groups/${activeGroup.id}/folders/${editingFolderId}` 
        : `/api/question-groups/${activeGroup.id}/folders`;
      const method = editingFolderId ? "PUT" : "POST";
      
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({ name: folderName, description: folderDesc })
      });

      if (res.ok) {
        toast(editingFolderId ? "Folder modified successfully" : "Folder created");
        setShowFolderModal(false);
        setFolderName("");
        setFolderDesc("");
        setEditingFolderId(null);
        fetchFolders(activeGroup.id);
      }
    } catch {
      toast("Error saving folder context", "error");
    }
  };

  const handleDeleteFolder = (folder: Folder) => {
    confirm({
      title: "Purge Topic Folder?",
      message: `Are you sure you want to delete folder "${folder.name}"? All questions inside will be purged.`,
      confirmText: "Purge Folder",
      type: "danger",
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/question-groups/${activeGroup!.id}/folders/${folder.id}`, { method: "DELETE" });
          if (res.ok) {
            toast("Folder purged.");
            fetchFolders(activeGroup!.id);
          }
        } catch {
          toast("Error deleting folder", "error");
        }
      }
    });
  };

  // QUESTIONS CRUD
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFolder || !qText.trim()) return;

    try {
      const url = editingQId 
        ? `/api/folders/${activeFolder.id}/questions/${editingQId}` 
        : `/api/folders/${activeFolder.id}/questions`;
      const method = editingQId ? "PUT" : "POST";

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({ text: qText, type: qType, points: qPoints, groupId: activeFolder.groupId })
      });

      if (res.ok) {
        toast(editingQId ? "Question modified" : "Question added manually");
        setShowQuestionModal(false);
        setQText("");
        setQType("SingleChoice");
        setQPoints(10);
        setEditingQId(null);
        fetchQuestions(activeFolder.id);
      }
    } catch {
      toast("Error registering question", "error");
    }
  };

  const handleDeleteQuestion = (q: Question) => {
    confirm({
      title: "Purge Question?",
      message: "Are you sure you want to permanently delete this question and its options?",
      confirmText: "Purge",
      type: "danger",
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/folders/${activeFolder!.id}/questions/${q.id}`, { method: "DELETE" });
          if (res.ok) {
            toast("Question purged.");
            fetchQuestions(activeFolder!.id);
          }
        } catch {
          toast("Error purgin question", "error");
        }
      }
    });
  };

  // QUESTION IMAGES
  const handleSetQuestionImage = async (q: Question) => {
    // Simulate immediate graphic linkage
    try {
      const res = await apiFetch(`/api/folders/${activeFolder!.id}/questions/${q.id}/image`, {
        method: "POST",
        body: JSON.stringify({ imageUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=400&q=80" })
      });
      if (res.ok) {
        toast("High-resolution graphic linked to question.");
        fetchQuestions(activeFolder!.id);
      }
    } catch {
      toast("Error setting image", "error");
    }
  };

  const handleDeleteQuestionImage = async (q: Question) => {
    try {
      const res = await apiFetch(`/api/folders/${activeFolder!.id}/questions/${q.id}/image`, { method: "DELETE" });
      if (res.ok) {
        toast("Graphic cleared.");
        fetchQuestions(activeFolder!.id);
      }
    } catch {
      toast("Error resetting graphic", "error");
    }
  };

  // ANSWER OPTIONS CRUD
  const handleAddOption = async (qId: string) => {
    if (!newOptionText.trim()) return;

    try {
      const res = await apiFetch(`/api/questions/${qId}/options`, {
        method: "POST",
        body: JSON.stringify({ text: newOptionText, isCorrect: newOptionIsCorrect })
      });
      if (res.ok) {
        toast("Answer option added.");
        setNewOptionText("");
        setNewOptionIsCorrect(false);
        fetchQuestions(activeFolder!.id);
      }
    } catch {
      toast("Error adding answer option", "error");
    }
  };

  const handleDeleteOption = async (qId: string, optId: string) => {
    try {
      const res = await apiFetch(`/api/questions/${qId}/options/${optId}`, { method: "DELETE" });
      if (res.ok) {
        toast("Answer option purged.");
        fetchQuestions(activeFolder!.id);
      }
    } catch {
      toast("Error purging option", "error");
    }
  };

  const handleSetOptionImage = async (qId: string, optId: string) => {
    try {
      const res = await apiFetch(`/api/questions/${qId}/options/${optId}/image`, {
        method: "POST",
        body: JSON.stringify({ imageUrl: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?auto=format&fit=crop&w=300&q=80" })
      });
      if (res.ok) {
        toast("Option graphic linked.");
        fetchQuestions(activeFolder!.id);
      }
    } catch {
      toast("Error updating graphic", "error");
    }
  };

  const handleDeleteOptionImage = async (qId: string, optId: string) => {
    try {
      const res = await apiFetch(`/api/questions/${qId}/options/${optId}/image`, { method: "DELETE" });
      if (res.ok) {
        toast("Option graphic purged.");
        fetchQuestions(activeFolder!.id);
      }
    } catch {
      toast("Error purging graphic", "error");
    }
  };

  // MANUAL SUBMISSIONS TOOLING
  const handleManualSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQId) return;

    try {
      const res = await apiFetch("/api/answers", {
        method: "POST",
        body: JSON.stringify({ questionId: manualQId, optionId: manualOptId, textValue: manualTextVal })
      });
      if (res.ok) {
        toast("Manual submission recorded successfully!");
        setShowManualLogger(false);
        setManualQId("");
        setManualOptId("");
        setManualTextVal("");
      }
    } catch {
      toast("Error lodging manual answer.", "error");
    }
  };

  // Filters
  const filteredStudents = students.filter(
    s => s.username.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(groupSearch.toLowerCase()));

  // Skeleton
  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-slate-800/40 rounded-xl animate-pulse w-1/4" />
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-28 bg-slate-800/40 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* VIEW: ORG DASHBOARD */}
      {currentTab === "org-dashboard" && stats && (
        <div className="space-y-8 animate-fade-in">
          <div>
            <h2 className="font-display font-black text-3xl text-white">Dashboard Overview</h2>
            <p className="text-slate-400 text-sm mt-1">Students and question groups scoped to your organization.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card rounded-2xl p-6 border border-white/5 relative overflow-hidden">
              <Users className="w-8 h-8 text-indigo-400 absolute right-6 top-6 opacity-20" />
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Scoped Students</p>
              <h3 className="font-display text-4xl font-bold text-white mt-2">{stats.studentCount}</h3>
              <p className="text-xs text-indigo-300 mt-2">Active accounts enrolled</p>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-white/5 relative overflow-hidden">
              <Database className="w-8 h-8 text-[#4cd7f6] absolute right-6 top-6 opacity-20" />
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Question Groups</p>
              <h3 className="font-display text-4xl font-bold text-white mt-2">{stats.groupCount}</h3>
              <p className="text-xs text-[#4cd7f6] mt-2">Topic banks recorded</p>
            </div>
          </div>

          {/* Quick Actions & Manual Tool - replaces the fabricated "Live Quiz Attempts" card
              and the fabricated Recent Activities feed (stats.activeQuizzes / stats.recentActivity
              never existed on the real backend). */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-card rounded-3xl p-6 border border-white/10 space-y-4 flex flex-col justify-center items-center text-center min-h-[180px]">
              <ClipboardList className="w-10 h-10 text-slate-600" />
              <div>
                <h3 className="font-display font-bold text-lg text-white">Activity feed not available yet</h3>
                <p className="text-slate-400 text-xs mt-1 max-w-sm">
                  There's no backend endpoint yet for recent activity within your organization.
                  Use Question Bank and Students Roster to manage things directly for now.
                </p>
              </div>
            </div>

            <div className="glass-card rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-white mb-2">Paper Submissions Logger</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Have students who completed quizzes on paper? Log their manual assessments instantly here to compile stats.
                </p>
              </div>
              <button
                onClick={() => setShowManualLogger(true)}
                className="w-full bg-[#1c263f] border border-white/10 hover:bg-white/10 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-colors mt-6 uppercase tracking-wider"
              >
                Log Manual Grades
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: STUDENTS LIST */}
      {currentTab === "students" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-display font-black text-3xl text-white">Students Roster</h2>
              <p className="text-slate-400 text-sm mt-1">Manage and provision student access scoped automatically to your tenant.</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3.5 top-3 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search Enrolled Students..."
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                className="w-full bg-[#131b2e] border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:border-indigo-500 transition-all outline-none text-white"
              />
            </div>
            <button
              onClick={() => setShowStudentModal(true)}
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-5 rounded-xl text-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Enroll New Student</span>
            </button>
          </div>

          {/* Roster of Students */}
          <div className="bg-[#131b2e]/40 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-slate-900/40 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                    <th className="p-4 pl-6">Student</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">status</th>
                    <th className="p-4 text-right pr-6">Creds controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {filteredStudents.map(student => (
                    <tr key={student.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 pl-6 font-semibold text-white">{student.username}</td>
                      <td className="p-4 text-slate-300 font-mono text-xs">{student.email}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${
                          student.status === "Active" ? "text-emerald-400" : "text-rose-400"
                        }`}>
                          {"● " + student.status.toLowerCase()}
                        </span>
                      </td>
                      <td className="p-4 text-right pr-6">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleResetStudentPassword(student)}
                            className="px-2.5 py-1.5 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/15 text-amber-300 rounded-lg text-xs transition-colors"
                          >
                            Reset
                          </button>
                          {student.status === "Active" && (
                            <button
                              onClick={() => handleDisableStudent(student)}
                              className="px-2.5 py-1.5 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/15 text-rose-300 rounded-lg text-xs transition-colors"
                            >
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Enroll student modal */}
          {showStudentModal && (
            <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowStudentModal(false)} />
              <div className="relative w-full max-w-md glass-card rounded-3xl p-6 shadow-2xl border border-white/15 overflow-hidden">
                <h3 className="font-display font-bold text-xl text-white mb-4">Enroll New Student</h3>
                <form onSubmit={handleCreateStudent} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Username <span className="normal-case text-slate-500 font-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={studentUser}
                        onChange={e => setStudentUser(e.target.value)}
                        placeholder="derived from email if left blank"
                        className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 transition-all outline-none text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Temporary Password
                      </label>
                      <input
                        type="password"
                        required
                        value={studentPass}
                        onChange={e => setStudentPass(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 transition-all outline-none text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Phone Number <span className="normal-case text-slate-500 font-normal">(E.164 format)</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={studentPhoneNumber}
                      onChange={e => setStudentPhoneNumber(e.target.value)}
                      placeholder="+14155552671"
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 transition-all outline-none text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      required
                      value={studentEmail}
                      onChange={e => setStudentEmail(e.target.value)}
                      placeholder="s.jenkins@organization.edu"
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 transition-all outline-none text-white"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowStudentModal(false)}
                      className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
                    >
                      Enroll Student
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: QUESTION GROUPS (CRUD) */}
      {currentTab === "question-groups" && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h2 className="font-display font-black text-3xl text-white">Question Bank</h2>
            <p className="text-slate-400 text-sm mt-1">Design course competencies, syllabus chapters, and quizzes.</p>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3.5 top-3 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search Question Groups..."
                value={groupSearch}
                onChange={e => setGroupSearch(e.target.value)}
                className="w-full bg-[#131b2e] border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:border-indigo-500 transition-all outline-none text-white"
              />
            </div>
            <button
              onClick={() => {
                setEditingGroupId(null);
                setGroupName("");
                setGroupDesc("");
                setShowGroupModal(true);
              }}
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-5 rounded-xl text-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Question Group</span>
            </button>
          </div>

          {/* Groups list */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map(group => (
              <div 
                key={group.id} 
                className="glass-card rounded-2xl p-6 border border-white/5 flex flex-col justify-between h-56 hover:border-white/15 transition-all cursor-pointer group"
                onClick={() => {
                  setActiveGroup(group);
                  fetchFolders(group.id);
                  setCurrentTab("group-folders");
                }}
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-display font-bold text-lg text-white group-hover:text-[#c3c0ff] transition-colors truncate max-w-[180px]">{group.name}</h3>
                    <span 
                      onClick={(e) => {
                        e.stopPropagation(); // prevent drill down
                        handleToggleGroupStatus(group);
                      }}
                      className={`px-2.5 py-0.5 rounded-full font-bold font-mono text-[9px] uppercase cursor-pointer ${
                        group.status === "Live" 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {group.status}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-2 line-clamp-3 leading-relaxed font-sans">{group.description || "No description recorded."}</p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
                  <span className="text-[10px] text-slate-500 font-mono uppercase">ID: {group.id}</span>
                  <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setEditingGroupId(group.id);
                        setGroupName(group.name);
                        setGroupDesc(group.description);
                        setShowGroupModal(true);
                      }}
                      className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg border border-white/5 transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group)}
                      className="p-1.5 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/10 transition-colors"
                      title="Purge"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Create/Edit group modal */}
          {showGroupModal && (
            <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowGroupModal(false)} />
              <div className="relative w-full max-w-md glass-card rounded-3xl p-6 shadow-2xl border border-white/15 overflow-hidden">
                <h3 className="font-display font-bold text-xl text-white mb-4">
                  {editingGroupId ? "Modify Question Group" : "Create Question Group"}
                </h3>
                <form onSubmit={handleSaveGroup} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Group Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Molecular Biology"
                      value={groupName}
                      onChange={e => setGroupName(e.target.value)}
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 transition-all outline-none text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Brief Description
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Overview of syllabus scopes, target grades, or curriculum tags..."
                      value={groupDesc}
                      onChange={e => setGroupDesc(e.target.value)}
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 transition-all outline-none text-white resize-none"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowGroupModal(false)}
                      className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
                    >
                      Save Group
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: FOLDERS IN GROUP (CRUD) */}
      {currentTab === "group-folders" && activeGroup && (
        <div className="space-y-6 animate-fade-in">
          {/* Breadcrumb back navigation */}
          <button
            onClick={() => {
              setActiveGroup(null);
              setCurrentTab("question-groups");
            }}
            className="flex items-center gap-2 text-sm text-[#c3c0ff] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Question Bank</span>
          </button>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="font-display font-black text-3xl text-white">{activeGroup.name} Topics</h2>
              <p className="text-slate-400 text-sm mt-1">Create or drill down into sub-folders representing modules.</p>
            </div>
            <button
              onClick={() => {
                setEditingFolderId(null);
                setFolderName("");
                setFolderDesc("");
                setShowFolderModal(true);
              }}
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-5 rounded-xl text-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Sub-Topic Folder</span>
            </button>
          </div>

          {/* Folders list */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {folders.map(folder => (
              <div
                key={folder.id}
                className="glass-card rounded-2xl p-6 border border-white/5 flex flex-col justify-between h-48 hover:border-white/15 transition-all cursor-pointer group"
                onClick={() => {
                  setActiveFolder(folder);
                  fetchQuestions(folder.id);
                  setCurrentTab("folder-questions");
                }}
              >
                <div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl text-[#c3c0ff] shrink-0">
                      <FolderIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-white group-hover:text-[#c3c0ff] transition-colors truncate max-w-[170px]">
                        {folder.name}
                      </h3>
                      <p className="text-slate-400 text-xs mt-1 font-sans line-clamp-2 leading-relaxed">{folder.description || "No description recorded."}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4" onClick={e => e.stopPropagation()}>
                  <span className="text-[10px] text-slate-500 font-mono uppercase">ID: {folder.id}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingFolderId(folder.id);
                        setFolderName(folder.name);
                        setFolderDesc(folder.description);
                        setShowFolderModal(true);
                      }}
                      className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg border border-white/5 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteFolder(folder)}
                      className="p-1.5 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {folders.length === 0 && (
              <div className="col-span-full py-12 text-center bg-white/5 rounded-3xl border border-white/5">
                <FolderIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h4 className="font-display font-semibold text-white">Folder Registry Empty</h4>
                <p className="text-slate-400 text-xs mt-1">This course currently contains no topic folders.</p>
              </div>
            )}
          </div>

          {/* Folder Modal */}
          {showFolderModal && (
            <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowFolderModal(false)} />
              <div className="relative w-full max-w-md glass-card rounded-3xl p-6 shadow-2xl border border-white/15 overflow-hidden">
                <h3 className="font-display font-bold text-xl text-white mb-4">
                  {editingFolderId ? "Modify Topic Folder" : "Add Topic Folder"}
                </h3>
                <form onSubmit={handleSaveFolder} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Folder Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Genetics & Heredity"
                      value={folderName}
                      onChange={e => setFolderName(e.target.value)}
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 transition-all outline-none text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Brief Description
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Transcription mechanics and mendelian patterns review..."
                      value={folderDesc}
                      onChange={e => setFolderDesc(e.target.value)}
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 transition-all outline-none text-white resize-none"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowFolderModal(false)}
                      className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
                    >
                      Save Folder
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: QUESTIONS IN FOLDER */}
      {currentTab === "folder-questions" && activeFolder && activeGroup && (
        <div className="space-y-6 animate-fade-in">
          {/* Breadcrumb */}
          <button
            onClick={() => {
              setActiveFolder(null);
              fetchFolders(activeGroup.id);
              setCurrentTab("group-folders");
            }}
            className="flex items-center gap-2 text-sm text-[#c3c0ff] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {activeGroup.name} Topics</span>
          </button>

          {/* Title & Central Prominent AI Trigger */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white/5 p-6 rounded-3xl border border-white/10 shadow-xl">
            <div>
              <div className="flex items-center gap-2">
                <FolderIcon className="w-5 h-5 text-indigo-400" />
                <span className="text-xs font-mono uppercase text-indigo-300 tracking-wider">TOPIC FOLDER DETAIL</span>
              </div>
              <h2 className="font-display font-black text-3xl text-white mt-1.5">{activeFolder.name}</h2>
              <p className="text-slate-400 text-sm mt-1">{activeFolder.description || "Manage questions, correct answers, and AI-generation metrics."}</p>
            </div>

            <div className="flex gap-3 w-full lg:w-auto shrink-0">
              {/* ✨ PROMINENT GRADIENT AI BUTTON */}
              <button
                onClick={() => openAiModalWithTarget(activeGroup.id, activeFolder.id)}
                className="flex-1 lg:flex-none py-3 px-6 ai-gradient hover:scale-[1.02] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-transform cursor-pointer border border-white/10"
              >
                <Sparkles className="w-5 h-5 fill-white/20 animate-spin" style={{ animationDuration: '4s' }} />
                <span>Generate with AI</span>
              </button>

              <button
                onClick={() => {
                  setEditingQId(null);
                  setQText("");
                  setQType("SingleChoice");
                  setQPoints(10);
                  setShowQuestionModal(true);
                }}
                className="flex-1 lg:flex-none py-3 px-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5 text-indigo-400" />
                <span>Add Question</span>
              </button>
            </div>
          </div>

          {/* List of Questions */}
          <div className="space-y-4">
            {questions.map((q, idx) => {
              const isExpanded = expandedQuestionId === q.id;
              return (
                <div key={q.id} className="glass-card rounded-2xl border border-white/5 overflow-hidden transition-colors">
                  {/* Summary Bar */}
                  <div 
                    className="p-5 flex justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-white/5 transition-all select-none"
                    onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                        <span className="font-mono text-[9px] px-2 py-0.5 rounded font-bold uppercase bg-indigo-500/10 border border-indigo-500/20 text-[#c3c0ff]">
                          {q.type}
                        </span>
                        <span className="font-mono text-[9px] px-2 py-0.5 rounded font-bold uppercase bg-slate-800 border border-white/5 text-slate-300">
                          {q.points} PTS
                        </span>
                        {q.image && (
                          <span className="font-mono text-[9px] px-2 py-0.5 rounded font-bold uppercase bg-[#4cd7f6]/10 border border-[#4cd7f6]/20 text-[#4cd7f6] flex items-center gap-1">
                            <Image className="w-3 h-3" />
                            <span>IMAGE</span>
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-white leading-relaxed font-sans">{idx+1}. {q.text}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setEditingQId(q.id);
                          setQText(q.text);
                          setQType(q.type);
                          setQPoints(q.points);
                          setShowQuestionModal(true);
                        }}
                        className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4.5 h-4.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q)}
                        className="p-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                      <button
                        onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                        className="p-1.5 hover:bg-white/10 text-slate-300 rounded-lg transition-all"
                      >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Option Management Drawer */}
                  {isExpanded && (
                    <div className="border-t border-white/5 bg-[#0b1326]/50 p-6 space-y-6">
                      {/* Graphics Area */}
                      <div className="flex flex-col md:flex-row gap-5 items-start bg-white/5 p-4 rounded-xl border border-white/5">
                        <div className="shrink-0 w-24 h-16 rounded-xl border border-white/10 bg-slate-900 overflow-hidden flex items-center justify-center text-slate-600 relative group">
                          {q.image ? (
                            <img src={q.image} alt="Question prompt graphic" className="w-full h-full object-cover" />
                          ) : (
                            <HelpCircle className="w-6 h-6 text-slate-700" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-1">Question Banner Graphic</h4>
                          <p className="text-slate-400 text-xs">Bind a diagnostic graphic, diagram, or formula sheet to the prompt.</p>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleSetQuestionImage(q)}
                              className="text-xs font-semibold text-[#4cd7f6] hover:underline"
                            >
                              {q.image ? "Link Another Graphic" : "Link Diagnostic Image"}
                            </button>
                            {q.image && (
                              <button
                                onClick={() => handleDeleteQuestionImage(q)}
                                className="text-xs font-semibold text-rose-400 hover:underline"
                              >
                                Delete Graphic
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Options List */}
                      <div className="space-y-3.5">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Answer Choice Alternatives</h4>
                        <div className="space-y-2">
                          {q.options?.map(opt => (
                            <div key={opt.id} className="p-3 bg-[#131b2e] border border-white/5 rounded-xl flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className={`p-1 rounded-lg ${opt.isCorrect ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-slate-600"}`}>
                                  <Check className="w-4.5 h-4.5 font-black" />
                                </div>
                                <span className={`text-xs ${opt.isCorrect ? "text-emerald-300 font-semibold" : "text-slate-300"}`}>{opt.text}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleSetOptionImage(q.id, opt.id)}
                                  className="text-[10px] text-slate-400 hover:text-white transition-colors"
                                >
                                  {opt.image ? "Change Graphic" : "Add Image"}
                                </button>
                                {opt.image && (
                                  <button
                                    onClick={() => handleDeleteOptionImage(q.id, opt.id)}
                                    className="text-[10px] text-rose-400 hover:underline"
                                  >
                                    Clear Image
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteOption(q.id, opt.id)}
                                  className="p-1 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {(!q.options || q.options.length === 0) && (
                            <p className="text-xs text-slate-500 leading-relaxed font-sans">No answer alternatives added. Add at least 2 choices below so students can answer.</p>
                          )}
                        </div>

                        {/* Fast Choice Creator Form */}
                        <div className="pt-3 border-t border-white/5 flex gap-2 flex-wrap md:flex-nowrap">
                          <input
                            type="text"
                            placeholder="Add choice alternative..."
                            value={newOptionText}
                            onChange={e => setNewOptionText(e.target.value)}
                            className="flex-1 bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2 text-xs outline-none text-white focus:border-indigo-500 transition-colors"
                          />
                          <label className="flex items-center gap-2 text-xs text-slate-300 font-sans cursor-pointer whitespace-nowrap bg-white/5 px-3 py-2 rounded-xl border border-white/5">
                            <input
                              type="checkbox"
                              checked={newOptionIsCorrect}
                              onChange={e => setNewOptionIsCorrect(e.target.checked)}
                              className="accent-indigo-500 cursor-pointer"
                            />
                            <span>Mark Correct</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleAddOption(q.id)}
                            className="px-4 py-2 bg-[#1c263f] hover:bg-indigo-600 text-white font-semibold rounded-xl text-xs transition-colors shrink-0"
                          >
                            Add Choice
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {questions.length === 0 && (
              <div className="py-12 text-center bg-white/5 rounded-3xl border border-white/5">
                <BrainCircuit className="w-12 h-12 text-slate-600 mx-auto mb-3 animate-bounce" />
                <h4 className="font-display font-semibold text-white">Folder is Empty</h4>
                <p className="text-slate-400 text-xs mt-1">Paste study guides to generate interactive questions instantly with AI above.</p>
              </div>
            )}
          </div>

          {/* Question Creation/Edit Modal */}
          {showQuestionModal && (
            <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowQuestionModal(false)} />
              <div className="relative w-full max-w-md glass-card rounded-3xl p-6 shadow-2xl border border-white/15 overflow-hidden">
                <h3 className="font-display font-bold text-xl text-white mb-4">
                  {editingQId ? "Modify Question" : "Add Question Manually"}
                </h3>
                <form onSubmit={handleSaveQuestion} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Question Prompt
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="e.g. Which biochemical pathway is primary in anaerobes?"
                      value={qText}
                      onChange={e => setQText(e.target.value)}
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 transition-all outline-none text-white resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                        Type Format
                      </label>
                      <select
                        value={qType}
                        onChange={e => setQType(e.target.value as any)}
                        className="w-full bg-[#1c263f] border border-white/10 rounded-xl px-4 py-3 text-sm outline-none text-white focus:border-indigo-500 transition-colors"
                      >
                        <option value="SingleChoice">Multiple Choice</option>
                        <option value="MultipleChoice">Multi-Select</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                        Competency Points
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={qPoints}
                        onChange={e => setQPoints(Number(e.target.value))}
                        className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 transition-colors outline-none text-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowQuestionModal(false)}
                      className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
                    >
                      Save Question
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: MANUAL ANSWER SUBMISSION WRITER */}
      {showManualLogger && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowManualLogger(false)} />
          <div className="relative w-full max-w-md glass-card rounded-3xl p-6 shadow-2xl border border-white/15 overflow-hidden">
            <h3 className="font-display font-bold text-xl text-white mb-2">Manual Paper Submission Logger</h3>
            <p className="text-slate-400 text-xs mb-4">Input paper answers straight into database endpoints to compile student cohort scores.</p>
            <form onSubmit={handleManualSubmission} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Select Target Question (Simulated ID)
                </label>
                <select
                  required
                  value={manualQId}
                  onChange={e => setManualQId(e.target.value)}
                  className="w-full bg-[#1c263f] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 transition-all outline-none text-white"
                >
                  <option value="">-- Choose Prompt --</option>
                  <option value="q-1">Glycolysis primary output (q-1)</option>
                  <option value="q-2">Cellular respiration inhibitors (q-2)</option>
                  <option value="q-3">PII GDPR classification (q-3)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Logged Choice ID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. opt-1, opt-2"
                    value={manualOptId}
                    onChange={e => setManualOptId(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 transition-all outline-none text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Written Explanation
                  </label>
                  <input
                    type="text"
                    placeholder="Optional details..."
                    value={manualTextVal}
                    onChange={e => setManualTextVal(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 transition-all outline-none text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualLogger(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
                >
                  Lodge Score Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
