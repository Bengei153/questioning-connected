import React from "react";
import { useAuthStore } from "../lib/authStore";
import { 
  LayoutDashboard, 
  Database, 
  BrainCircuit, 
  Users, 
  Activity, 
  HelpCircle, 
  Settings, 
  Plus, 
  LogOut, 
  ShieldAlert, 
  GraduationCap, 
  Menu,
  Sparkles,
  Bell,
  Search,
  User,
  Building2
} from "lucide-react";

interface SideNavBarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openAiModal: () => void;
}

export default function SideNavBar({ currentTab, setCurrentTab, openAiModal }: SideNavBarProps) {
  const { user, logout } = useAuthStore();

  if (!user) return null;

  // Render Left SideNavBar for SuperAdmin and OrgAdmin
  if (user.role === "SuperAdmin" || user.role === "OrgAdmin") {
    return (
      <aside id="admin-sidebar" className="w-66 border-r border-white/10 bg-[#131b2e]/60 backdrop-blur-xl h-screen flex flex-col py-8 px-4 shrink-0 fixed top-0 left-0 z-40">
        {/* Brand Header */}
        <div className="mb-8 px-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600/20 text-[#c3c0ff] border border-indigo-500/20 rounded-lg">
              <BrainCircuit className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl text-[#c3c0ff]">Questioning</h1>
              <p className="text-[10px] text-slate-400 font-mono tracking-wider">
                {user.role === "SuperAdmin" ? "SYSTEM CONTROL" : "ORG MANAGEMENT"}
              </p>
            </div>
          </div>
        </div>

        {/* Primary CTA (AI Builder Entry) */}
        <div className="px-2 mb-6">
          <button 
            onClick={openAiModal}
            className="w-full ai-gradient text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20"
          >
            <Sparkles className="w-4 h-4 fill-white/20 animate-spin" style={{ animationDuration: '3s' }} />
            <span className="text-sm">Create with AI</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-2">
          {user.role === "SuperAdmin" && (
            <>
              <button
                onClick={() => setCurrentTab("dashboard")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  currentTab === "dashboard"
                    ? "text-[#c3c0ff] bg-[#c3c0ff]/10 font-bold border-r-2 border-[#c3c0ff]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => setCurrentTab("organizations")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  currentTab === "organizations"
                    ? "text-[#c3c0ff] bg-[#c3c0ff]/10 font-bold border-r-2 border-[#c3c0ff]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <Building2 className="w-5 h-5" />
                <span>Organizations</span>
              </button>

              <button
                onClick={() => setCurrentTab("org-admins")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  currentTab === "org-admins"
                    ? "text-[#c3c0ff] bg-[#c3c0ff]/10 font-bold border-r-2 border-[#c3c0ff]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <Users className="w-5 h-5" />
                <span>Org Admins</span>
              </button>

              <button
                onClick={() => setCurrentTab("quiz-oversight")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  currentTab === "quiz-oversight"
                    ? "text-[#c3c0ff] bg-[#c3c0ff]/10 font-bold border-r-2 border-[#c3c0ff]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <Database className="w-5 h-5" />
                <span>Oversight Bank</span>
              </button>
            </>
          )}

          {user.role === "OrgAdmin" && (
            <>
              <button
                onClick={() => setCurrentTab("org-dashboard")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  currentTab === "org-dashboard"
                    ? "text-[#c3c0ff] bg-[#c3c0ff]/10 font-bold border-r-2 border-[#c3c0ff]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => setCurrentTab("students")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  currentTab === "students"
                    ? "text-[#c3c0ff] bg-[#c3c0ff]/10 font-bold border-r-2 border-[#c3c0ff]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <GraduationCap className="w-5 h-5" />
                <span>Students</span>
              </button>

              <button
                onClick={() => setCurrentTab("question-groups")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  currentTab === "question-groups" || currentTab === "group-folders"
                    ? "text-[#c3c0ff] bg-[#c3c0ff]/10 font-bold border-r-2 border-[#c3c0ff]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <Database className="w-5 h-5" />
                <span>Question Bank</span>
              </button>
            </>
          )}

          <button
            onClick={() => setCurrentTab("profile")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
              currentTab === "profile"
                ? "text-[#c3c0ff] bg-[#c3c0ff]/10 font-bold border-r-2 border-[#c3c0ff]"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            <User className="w-5 h-5" />
            <span>My Profile</span>
          </button>
        </nav>

        {/* Sidebar Footer with Active Admin Profile */}
        <div className="mt-auto pt-4 border-t border-white/5 px-2">
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 transition-colors text-sm font-medium mb-4"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>

          <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
            <div className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center text-indigo-300 font-bold text-sm shrink-0">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{user.username}</p>
              <p className="text-[10px] text-slate-400 truncate font-mono">{user.email || user.role}</p>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return null;
}

// Student Top NavBar
interface TopNavBarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openQuizList: () => void;
}

export function StudentTopNavBar({ currentTab, setCurrentTab, openQuizList }: TopNavBarProps) {
  const { user, logout } = useAuthStore();

  if (!user) return null;

  return (
    <>
      <header className="bg-[#131b2e]/60 backdrop-blur-md border-b border-white/10 w-full px-6 md:px-12 h-20 fixed top-0 left-0 z-50 flex justify-between items-center">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentTab("student-dashboard")}>
            <div className="p-1.5 bg-indigo-600/20 text-[#c3c0ff] border border-indigo-500/20 rounded-lg">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <h1 className="font-display text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#c3c0ff] via-[#4cd7f6] to-[#d0bcff]">
              Questioning
            </h1>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => setCurrentTab("student-dashboard")}
              className={`text-sm font-semibold transition-all pb-1 border-b-2 ${
                currentTab === "student-dashboard"
                  ? "text-[#c3c0ff] border-[#c3c0ff]"
                  : "text-slate-400 border-transparent hover:text-[#c3c0ff]"
              }`}
            >
              My Dashboard
            </button>
            <button
              onClick={() => setCurrentTab("student-history")}
              className={`text-sm font-semibold transition-all pb-1 border-b-2 ${
                currentTab === "student-history"
                  ? "text-[#c3c0ff] border-[#c3c0ff]"
                  : "text-slate-400 border-transparent hover:text-[#c3c0ff]"
              }`}
            >
              Quiz History
            </button>
            <button
              onClick={() => setCurrentTab("student-profile")}
              className={`text-sm font-semibold transition-all pb-1 border-b-2 ${
                currentTab === "student-profile"
                  ? "text-[#c3c0ff] border-[#c3c0ff]"
                  : "text-slate-400 border-transparent hover:text-[#c3c0ff]"
              }`}
            >
              Profile Settings
            </button>
          </nav>
        </div>

        {/* Utilities & CTAs */}
        <div className="flex items-center gap-4">
          <button 
            onClick={openQuizList}
            className="ai-gradient text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:opacity-90 hover:scale-[1.03] transition-all"
          >
            Start Quiz
          </button>

          <div className="flex items-center gap-3 border-l border-white/10 pl-4">
            <button 
              onClick={() => logout()}
              className="p-2 text-slate-400 hover:text-rose-400 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>

            <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center text-[#c3c0ff] font-bold text-sm shrink-0">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold text-white truncate max-w-[120px]">{user.username}</p>
              <span className="text-[10px] text-slate-400 font-mono tracking-wide uppercase">STUDENT</span>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Header */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-[#131b2e]/90 border-t border-white/10 z-50 py-2 flex justify-around items-center backdrop-blur-xl">
        <button
          onClick={() => setCurrentTab("student-dashboard")}
          className={`flex flex-col items-center gap-1 ${
            currentTab === "student-dashboard" ? "text-[#c3c0ff]" : "text-slate-400"
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px]">Dashboard</span>
        </button>
        <button
          onClick={() => setCurrentTab("student-history")}
          className={`flex flex-col items-center gap-1 ${
            currentTab === "student-history" ? "text-[#c3c0ff]" : "text-slate-400"
          }`}
        >
          <Activity className="w-5 h-5" />
          <span className="text-[10px]">History</span>
        </button>
        <button
          onClick={openQuizList}
          className="w-12 h-12 rounded-full ai-gradient text-white flex items-center justify-center -mt-6 shadow-lg shadow-indigo-500/30 border-2 border-[#131b2e]"
        >
          <Plus className="w-6 h-6" />
        </button>
        <button
          onClick={() => setCurrentTab("student-profile")}
          className={`flex flex-col items-center gap-1 ${
            currentTab === "student-profile" ? "text-[#c3c0ff]" : "text-slate-400"
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px]">Profile</span>
        </button>
      </div>
    </>
  );
}
