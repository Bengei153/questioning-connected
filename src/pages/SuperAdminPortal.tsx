import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Users, 
  Activity, 
  Database, 
  Plus, 
  FileDown, 
  Settings2, 
  ShieldAlert, 
  Check, 
  X, 
  RefreshCw, 
  Search, 
  Edit3, 
  Trash2, 
  UserPlus, 
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { useUI } from "../components/UIUtilities";
import { apiFetch } from "../lib/authStore";
import { extractErrorMessage } from "../lib/apiError";
import { Organization, UserProfile, Question, SystemLog } from "../types";

interface SuperAdminPortalProps {
  currentTab: string;
}

export default function SuperAdminPortal({ currentTab }: SuperAdminPortalProps) {
  const { toast, confirm } = useUI();

  // Component State
  const [stats, setStats] = useState<any>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Search/Filter criteria
  const [orgSearch, setOrgSearch] = useState("");
  const [adminSearch, setAdminSearch] = useState("");
  const [qSearch, setQSearch] = useState("");

  // Modals
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [newOrgContactEmail, setNewOrgContactEmail] = useState("");

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPhoneNumber, setAdminPhoneNumber] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminOrgId, setAdminOrgId] = useState("");

  // Export indicator
  const [exporting, setExporting] = useState(false);

  const slugify = (value: string) =>
    value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");

  // Fetch core data on mount & tab change
  useEffect(() => {
    fetchData();
  }, [currentTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, orgsRes, usersRes, qsRes, logsRes] = await Promise.all([
        apiFetch("/api/admin/stats"),
        apiFetch("/api/organizations"),
        apiFetch("/api/users"),
        apiFetch("/api/admin/questions"),
        apiFetch("/api/admin/activity")
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (orgsRes.ok) setOrgs(await orgsRes.json());
      if (usersRes.ok) setAllUsers(await usersRes.json());
      if (qsRes.ok) setQuestions(await qsRes.json());
      if (logsRes.ok) setLogs(await logsRes.json());
    } catch (err) {
      toast("Error loading administrative structures", "error");
    } finally {
      setLoading(false);
    }
  };

  // Organizations triggers
  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim() || !newOrgSlug.trim() || !newOrgContactEmail.trim()) {
      toast("Please complete all organization fields", "warning");
      return;
    }

    try {
      const res = await apiFetch("/api/organizations", {
        method: "POST",
        body: JSON.stringify({
          name: newOrgName,
          slug: newOrgSlug,
          contactEmail: newOrgContactEmail
        })
      });
      if (res.ok) {
        toast("Organization provisioned successfully!");
        setNewOrgName("");
        setNewOrgSlug("");
        setNewOrgContactEmail("");
        setShowOrgModal(false);
        fetchData();
      } else {
        toast(await extractErrorMessage(res, "Failed to create organization"), "error");
      }
    } catch {
      toast("Network error provisioning organization.", "error");
    }
  };

  const toggleOrgStatus = (org: Organization) => {
    const action = org.active ? "deactivate" : "activate";
    confirm({
      title: `${org.active ? "Deactivate" : "Activate"} Organization?`,
      message: `Are you sure you want to change the operating status for ${org.name}? This affects all scoped admins and students immediately.`,
      confirmText: org.active ? "Confirm Deactivation" : "Confirm Activation",
      type: org.active ? "danger" : "info",
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/organizations/${org.id}/${action}`, {
            method: "PATCH"
          });
          if (res.ok) {
            toast(`Organization ${org.name} has been ${org.active ? "deactivated" : "activated"}.`);
            fetchData();
          }
        } catch {
          toast("Error toggling organization status.", "error");
        }
      }
    });
  };

  // Org admins triggers
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail || !adminPassword || !adminPhoneNumber || !adminOrgId) {
      toast("Please complete all registration fields", "warning");
      return;
    }

    try {
      const res = await apiFetch("/api/users/org-admins", {
        method: "POST",
        body: JSON.stringify({
          // Username is optional server-side - if blank, LoginSystem derives
          // one from the email's local-part.
          username: adminUsername || undefined,
          email: adminEmail,
          password: adminPassword,
          phoneNumber: adminPhoneNumber,
          organizationId: adminOrgId
        })
      });

      if (res.ok) {
        toast("New Org Admin registered - they'll need to verify their email before they can log in.");
        setShowAdminModal(false);
        setAdminUsername("");
        setAdminPhoneNumber("");
        setAdminEmail("");
        setAdminPassword("");
        setAdminOrgId("");
        fetchData();
      } else {
        toast(await extractErrorMessage(res, "Failed to register admin"), "error");
      }
    } catch {
      toast("Network error registering org admin", "error");
    }
  };

  const handleDisableUser = (u: UserProfile) => {
    confirm({
      title: "Disable Scoped User?",
      message: `Are you sure you want to immediately suspend access for ${u.username}? All active JWT tokens will be invalidated during next refresh.`,
      confirmText: "Deauthorize Access",
      type: "danger",
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/users/${u.id}/disable`, { method: "PATCH" });
          if (res.ok) {
            toast(`Suspended credentials for ${u.username}.`);
            fetchData();
          }
        } catch {
          toast("Error suspending user credentials.", "error");
        }
      }
    });
  };

  const handleResetUserPassword = (u: UserProfile) => {
    confirm({
      title: "Trigger Security Password Reset?",
      message: `Generate and dispatch a temporary security credential link to ${u.email}?`,
      confirmText: "Dispatch Password Reset",
      type: "warning",
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/users/${u.id}/reset-password`, { method: "POST" });
          if (res.ok) {
            toast(`Dispatched reset credentials to ${u.email}.`);
          }
        } catch {
          toast("Error dispatching password reset.", "error");
        }
      }
    });
  };

  // Question Purges
  const handleDeleteQuestion = (q: Question) => {
    confirm({
      title: "Purge Question from Database?",
      message: "Are you sure you want to delete this question? This will also remove all correlated multi-select/multiple-choice answers immediately. This action is irreversible.",
      confirmText: "Purge Record",
      type: "danger",
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/admin/questions/${q.id}`, { method: "DELETE" });
          if (res.ok) {
            toast("Question purged from cluster storage.");
            fetchData();
          }
        } catch {
          toast("Error deleting question.", "error");
        }
      }
    });
  };

  // PDF Export
  const triggerPDFExport = async () => {
    setExporting(true);
    toast("Generating system reports... Compiling audit logs.", "info");
    try {
      const res = await apiFetch("/api/admin/export/pdf", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        toast("Report generation completed!");
        // Simulate download
        window.open(data.downloadUrl, "_blank");
      }
    } catch {
      toast("Error generating report", "error");
    } finally {
      setExporting(false);
    }
  };

  // Filter lists
  const filteredOrgs = orgs.filter(o => o.name.toLowerCase().includes(orgSearch.toLowerCase()));
  const filteredAdmins = allUsers.filter(
    u => u.role === "OrgAdmin" &&
    (u.username.toLowerCase().includes(adminSearch.toLowerCase()) ||
     u.email.toLowerCase().includes(adminSearch.toLowerCase()))
  );
  const filteredQs = questions.filter(q => q.text.toLowerCase().includes(qSearch.toLowerCase()));

  // Real counts, derived from data we're already fetching correctly -
  // stats.orgCount/adminCount/studentCount/systemActivity24h/clusterHealth
  // never existed on the real backend response.
  const orgCount = orgs.length;
  const adminCount = allUsers.filter(u => u.role === "OrgAdmin").length;
  const studentCount = allUsers.filter(u => u.role === "Student").length;

  // Skeleton loaders helper
  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-slate-800/40 rounded-xl animate-pulse w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-slate-800/40 rounded-2xl animate-pulse" />)}
        </div>
        <div className="h-64 bg-slate-800/40 rounded-3xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-display font-black text-3xl text-white">System Controller</h2>
          <p className="text-slate-400 text-sm mt-1">
            Cluster Status: <strong className="text-emerald-400">ONLINE</strong> • Database Health: <strong className="text-emerald-400">100%</strong>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-slate-300 transition-colors"
            title="Reload Cluster State"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={triggerPDFExport}
            disabled={exporting}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-5 rounded-xl text-sm transition-all shadow-lg shadow-indigo-900/20"
          >
            <FileDown className="w-4 h-4" />
            <span>{exporting ? "Generating PDF..." : "Export System Audit"}</span>
          </button>
        </div>
      </div>

      {/* VIEW: DASHBOARD */}
      {currentTab === "dashboard" && stats && (
        <div className="space-y-8 animate-fade-in">
          {/* KPI Panels Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="glass-card rounded-2xl p-6 border border-white/5 shadow-xl relative overflow-hidden">
              <Building2 className="w-8 h-8 text-indigo-400 absolute right-6 top-6 opacity-20" />
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Tenants</p>
              <h3 className="font-display text-4xl font-bold text-white mt-2 tracking-tight">{orgCount}</h3>
              <p className="text-xs text-[#4cd7f6] mt-2 font-medium">Organizations Active</p>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-white/5 shadow-xl relative overflow-hidden">
              <Users className="w-8 h-8 text-cyan-400 absolute right-6 top-6 opacity-20" />
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Admins</p>
              <h3 className="font-display text-4xl font-bold text-white mt-2 tracking-tight">{adminCount}</h3>
              <p className="text-xs text-indigo-300 mt-2 font-medium">Tenant Managers</p>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-white/5 shadow-xl relative overflow-hidden">
              <Users className="w-8 h-8 text-indigo-400 absolute right-6 top-6 opacity-20" />
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Enrolled</p>
              <h3 className="font-display text-4xl font-bold text-white mt-2 tracking-tight">{studentCount}</h3>
              <p className="text-xs text-[#d0bcff] mt-2 font-medium">Active Students</p>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-white/5 shadow-xl relative overflow-hidden">
              <Database className="w-8 h-8 text-rose-400 absolute right-6 top-6 opacity-20" />
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Question Bank</p>
              <h3 className="font-display text-4xl font-bold text-white mt-2 tracking-tight">{stats.totalQuestions}</h3>
              <p className="text-xs text-rose-400 mt-2 font-medium">{stats.totalQuestionGroups} Question Groups</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* System logs */}
            <div className="lg:col-span-2 glass-card rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4">
              <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-400" />
                <span>System Ingress Log (Latest Alerts)</span>
              </h3>
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {logs.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-8">
                    No activity recorded yet - GET /api/admin/activity currently returns an empty list on the backend regardless of what's actually happened.
                  </p>
                )}
                {logs.map(log => (
                  <div key={log.id} className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-xs flex items-start gap-3">
                    <span className={`px-2.5 py-1 rounded font-bold uppercase shrink-0 font-mono text-[9px] ${
                      log.severity === "warning" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                      log.severity === "error" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                      "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                    }`}>
                      {log.severity}
                    </span>
                    <div className="flex-1">
                      <p className="text-slate-200 leading-relaxed font-sans">{log.message}</p>
                      <p className="text-slate-500 font-mono text-[10px] mt-1">{log.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions card - replaces the fabricated "Platform Orchestration" cluster panel */}
            <div className="glass-card rounded-3xl p-6 border border-white/10 shadow-2xl flex flex-col justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-white mb-4 flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-[#4cd7f6]" />
                  <span>Quick Actions</span>
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setShowOrgModal(true)}
                    className="w-full flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-medium py-2.5 px-4 rounded-xl text-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create Organization
                  </button>
                  <button
                    onClick={() => setShowAdminModal(true)}
                    className="w-full flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-medium py-2.5 px-4 rounded-xl text-sm transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    Register Org Admin
                  </button>
                </div>
              </div>
              <div className="mt-8 p-4 bg-[#c3c0ff]/5 border border-[#c3c0ff]/10 rounded-2xl flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-[#c3c0ff] shrink-0 mt-0.5" />
                <p className="text-xs text-slate-300 leading-relaxed">
                  Connected to LoginSystem and the Quiz API.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: ORGANIZATIONS */}
      {currentTab === "organizations" && (
        <div className="space-y-6 animate-fade-in">
          {/* Filtering Bar */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3.5 top-3 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter Organizations..."
                value={orgSearch}
                onChange={e => setOrgSearch(e.target.value)}
                className="w-full bg-[#131b2e] border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:border-indigo-500 transition-all outline-none text-white"
              />
            </div>
            <button
              onClick={() => setShowOrgModal(true)}
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-5 rounded-xl text-sm transition-all shadow-md shadow-indigo-900/10"
            >
              <Plus className="w-4 h-4" />
              <span>Create Organization</span>
            </button>
          </div>

          {/* Org roster */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrgs.map(org => (
              <div key={org.id} className="glass-card rounded-2xl p-6 border border-white/5 relative overflow-hidden flex flex-col justify-between h-48 hover:border-white/20 transition-all">
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-display font-bold text-lg text-white truncate max-w-[180px]">{org.name}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full font-bold font-mono text-[9px] uppercase ${
                      org.active 
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}>
                      {org.active ? "Active" : "Suspended"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase">ID: {org.id}</p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
                  <span className="text-[10px] text-slate-400">Created: {new Date(org.createdAt).toLocaleDateString()}</span>
                  <button
                    onClick={() => toggleOrgStatus(org)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                      org.active 
                        ? "bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 border-rose-500/25" 
                        : "bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                    }`}
                  >
                    {org.active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Create org modal */}
          {showOrgModal && (
            <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowOrgModal(false)} />
              <div className="relative w-full max-w-md glass-card rounded-3xl p-6 shadow-2xl border border-white/15 overflow-hidden">
                <h3 className="font-display font-bold text-xl text-white mb-4">Provision New Organization</h3>
                <form onSubmit={handleCreateOrg} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Organization Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Stanford Medical"
                      value={newOrgName}
                      onChange={e => {
                        setNewOrgName(e.target.value);
                        setNewOrgSlug(slugify(e.target.value));
                      }}
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 transition-all outline-none text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Slug <span className="normal-case text-slate-500 font-normal">(auto-filled, editable)</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. stanford-medical"
                      value={newOrgSlug}
                      onChange={e => setNewOrgSlug(slugify(e.target.value))}
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono focus:border-indigo-500 transition-all outline-none text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. admin@stanfordmedical.edu"
                      value={newOrgContactEmail}
                      onChange={e => setNewOrgContactEmail(e.target.value)}
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 transition-all outline-none text-white"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowOrgModal(false)}
                      className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
                    >
                      Create Organization
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: ORG ADMINS */}
      {currentTab === "org-admins" && (
        <div className="space-y-6 animate-fade-in">
          {/* Filters */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3.5 top-3 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search Scoped Admins..."
                value={adminSearch}
                onChange={e => setAdminSearch(e.target.value)}
                className="w-full bg-[#131b2e] border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:border-indigo-500 transition-all outline-none text-white"
              />
            </div>
            <button
              onClick={() => setShowAdminModal(true)}
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-5 rounded-xl text-sm transition-all shadow-md shadow-indigo-900/10"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register Org Admin</span>
            </button>
          </div>

          {/* Roster list */}
          <div className="bg-[#131b2e]/40 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-slate-900/40 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                    <th className="p-4 pl-6">Manager</th>
                    <th className="p-4">Tenant Scope</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right pr-6">Administrative Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {filteredAdmins.map(admin => {
                    const org = orgs.find(o => o.id === admin.organizationId);
                    return (
                      <tr key={admin.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 pl-6">
                          <div>
                            <p className="font-semibold text-white">{admin.username}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-medium text-indigo-300 bg-indigo-500/5 border border-indigo-500/15 px-2.5 py-1 rounded-lg">
                            {org ? org.name : "Unassigned Tenant"}
                          </span>
                        </td>
                        <td className="p-4 text-slate-300 font-mono text-xs">{admin.email}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${
                            admin.status === "Active" ? "text-emerald-400" : "text-rose-400"
                          }`}>
                            {"● " + admin.status.toLowerCase()}
                          </span>
                        </td>
                        <td className="p-4 text-right pr-6">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleResetUserPassword(admin)}
                              className="px-3 py-1.5 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/15 text-amber-300 rounded-lg text-xs transition-colors"
                            >
                              Reset Pass
                            </button>
                            {admin.status === "Active" && (
                              <button
                                onClick={() => handleDisableUser(admin)}
                                className="px-3 py-1.5 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/15 text-rose-300 rounded-lg text-xs transition-colors"
                              >
                                Suspend Account
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Create org admin modal */}
          {showAdminModal && (
            <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowAdminModal(false)} />
              <div className="relative w-full max-w-md glass-card rounded-3xl p-6 shadow-2xl border border-white/15 overflow-hidden">
                <h3 className="font-display font-bold text-xl text-white mb-4">Register Tenant Manager</h3>
                <form onSubmit={handleCreateAdmin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Scoped Organization
                    </label>
                    <select
                      value={adminOrgId}
                      onChange={e => setAdminOrgId(e.target.value)}
                      required
                      className="w-full bg-[#1c263f] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 transition-all outline-none text-white"
                    >
                      <option value="">-- Bind Tenant --</option>
                      {orgs.filter(o => o.active).map(o => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Username <span className="normal-case text-slate-500 font-normal">(optional - derived from email if left blank)</span>
                      </label>
                      <input
                        type="text"
                        value={adminUsername}
                        onChange={e => setAdminUsername(e.target.value)}
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
                        value={adminPassword}
                        onChange={e => setAdminPassword(e.target.value)}
                        className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 transition-all outline-none text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Phone Number <span className="normal-case text-slate-500 font-normal">(E.164 format, e.g. +14155552671)</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+14155552671"
                      value={adminPhoneNumber}
                      onChange={e => setAdminPhoneNumber(e.target.value)}
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
                      value={adminEmail}
                      onChange={e => setAdminEmail(e.target.value)}
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 transition-all outline-none text-white"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAdminModal(false)}
                      className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
                    >
                      Authorize Admin
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: OVERSIGHT BANK */}
      {currentTab === "quiz-oversight" && (
        <div className="space-y-6 animate-fade-in">
          {/* Filter Bar */}
          <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter Global Oversight Questions..."
                value={qSearch}
                onChange={e => setQSearch(e.target.value)}
                className="w-full bg-[#131b2e] border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:border-indigo-500 transition-all outline-none text-white"
              />
            </div>
          </div>

          {/* Roster of questions */}
          <div className="space-y-4">
            {filteredQs.map(q => (
              <div key={q.id} className="glass-card rounded-2xl p-5 border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-white/10 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[#c3c0ff]">
                      {q.type}
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-white/5 text-slate-300 uppercase">
                      {q.points} Points
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-200">{q.text}</p>
                </div>
                <button
                  onClick={() => handleDeleteQuestion(q)}
                  className="p-2 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/15 hover:border-rose-500/25 text-rose-300 rounded-xl transition-all self-end md:self-auto shrink-0"
                  title="Purge Record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {filteredQs.length === 0 && (
              <div className="py-12 text-center bg-white/5 rounded-3xl border border-white/5">
                <Database className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h4 className="font-display font-semibold text-white">No Question Logs Located</h4>
                <p className="text-slate-400 text-xs mt-1">No matches found for "{qSearch}" under global auditing scope.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}