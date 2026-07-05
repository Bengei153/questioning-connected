import React, { useState, useEffect } from "react";
import { BrainCircuit, Eye, EyeOff, Lock, User, Mail, ShieldAlert, Sparkles, AlertCircle, CheckCircle } from "lucide-react";
import { useAuthStore } from "../lib/authStore";
import { buildUrl } from "../lib/apiConfig";
import { useUI } from "../components/UIUtilities";

interface AuthPortalProps {
  onOpenSettings?: () => void;
}

export default function AuthPortal({ onOpenSettings }: AuthPortalProps) {
  const { setAuth } = useAuthStore();
  const { toast } = useUI();

  // Authentication Mode
  const [authMode, setAuthMode] = useState<"login" | "forgot" | "reset" | "verify">("login");

  // Form Inputs
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [forgotEmail, setForgotEmail] = useState("");
  
  const [resetUserId, setResetUserId] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [verifyUserId, setVerifyUserId] = useState("");
  const [verifyToken, setVerifyToken] = useState("");

  const [loading, setLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  // Check URL parameters on mount for verification or resets
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    const userId = params.get("userId");
    const token = params.get("token");

    if (userId && token) {
      if (mode === "reset") {
        setResetUserId(userId);
        setResetToken(token);
        setAuthMode("reset");
      } else {
        setVerifyUserId(userId);
        setVerifyToken(token);
        setAuthMode("verify");
        handleAutoVerify(userId, token);
      }
    }
  }, []);

  const handleAutoVerify = async (userId: string, token: string) => {
    setLoading(true);
    try {
      const res = await fetch(buildUrl("/api/auth/verify-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, token })
      });
      if (res.ok) {
        toast("Email address verified successfully!");
      }
    } catch {
      toast("Error dispatching email verification.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Login submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast("Please enter both username and password", "warning");
      return;
    }

    setLoading(true);
    setRateLimited(false);

    try {
      const res = await fetch(buildUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (res.ok) {
        setAuth(data);
        toast(`Welcome back, ${data.username}!`);
      } else {
        if (res.status === 429) {
          setRateLimited(true);
          toast("Rate limit exceeded. Please wait shortly.", "error");
        } else {
          toast(data.message || "Invalid credentials.", "error");
        }
      }
    } catch (err) {
      toast("Authentication service currently offline.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Forgot password submission
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(buildUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (res.ok) {
        toast("Dispatched secure password reset link!");
        setAuthMode("login");
      } else {
        toast(data.message || "Could not trigger reset.", "error");
      }
    } catch {
      toast("Network error triggering reset flow.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Reset password submission
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(buildUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: resetUserId || username,
          token: resetToken || "token-man",
          newPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast("Password updated successfully. You can now login!");
        setAuthMode("login");
      } else {
        toast(data.message || "Error updating credentials.", "error");
      }
    } catch {
      toast("Network error updating credentials.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#060e20] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Immersive Background Nodes */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />

      {/* Auth Container */}
      <div className="w-full max-w-md z-10">
        
        {/* Brand */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="p-3 bg-indigo-600/15 border border-indigo-500/25 rounded-2xl mb-3 shadow-xl shadow-indigo-500/5 animate-pulse">
            <BrainCircuit className="w-10 h-10 text-[#c3c0ff]" />
          </div>
          <h1 className="font-display font-black text-3xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-[#c3c0ff] to-[#4cd7f6]">
            QUESTIONING
          </h1>
          <p className="text-slate-400 text-xs mt-2 font-mono tracking-wide">
            ENTERPRISE KNOWLEDGE ASSESSMENT SUITE
          </p>
        </div>

        {/* Content Card */}
        <div className="glass-card rounded-3xl p-8 border border-white/10 shadow-2xl relative">
          
          {/* Rate-limited notice banner */}
          {rateLimited && (
            <div className="mb-6 p-4 rounded-xl bg-rose-950/30 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-3">
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
              <div>
                <p className="font-bold">Security Constraint Triggered</p>
                <p className="mt-1 leading-relaxed">
                  Too many access attempts logged. Authenticator rate-limit triggered on resource `/api/auth/login`. Try again shortly.
                </p>
              </div>
            </div>
          )}

          {/* MODE: LOGIN */}
          {authMode === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div>
                <h2 className="font-display font-bold text-xl text-white">Sign In</h2>
                <p className="text-slate-400 text-xs mt-1">
                  Access your organization's quiz & question console.
                </p>
              </div>

              <div className="space-y-4">
                {/* Username Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. alex, student, admin"
                      required
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none text-white"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setAuthMode("forgot")}
                      className="text-xs text-[#c3c0ff] hover:underline"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-12 pr-12 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-900/30 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? "Authenticating security tokens..." : "Authorize Sign In"}
              </button>
            </form>
          )}

          {/* MODE: FORGOT PASSWORD */}
          {authMode === "forgot" && (
            <form onSubmit={handleForgotSubmit} className="space-y-5">
              <div>
                <h2 className="font-display font-bold text-xl text-white">Reset Request</h2>
                <p className="text-slate-400 text-xs mt-1">
                  Submit your address to trigger a cryptographic password reset packet.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@organization.com"
                    required
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setAuthMode("login")}
                  className="flex-1 py-3 border border-white/10 hover:bg-white/5 rounded-xl text-sm font-semibold text-slate-300 transition-colors"
                >
                  Back to Login
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all disabled:opacity-50"
                >
                  Send Reset Code
                </button>
              </div>
            </form>
          )}

          {/* MODE: RESET PASSWORD */}
          {authMode === "reset" && (
            <form onSubmit={handleResetSubmit} className="space-y-5">
              <div>
                <h2 className="font-display font-bold text-xl text-white">Choose New Password</h2>
                <p className="text-slate-400 text-xs mt-1">
                  You are changing the security key for User ID: <strong className="text-[#c3c0ff]">{resetUserId}</strong>.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Enter New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50"
              >
                Save Credentials
              </button>
            </form>
          )}

          {/* MODE: EMAIL VERIFY ALERT */}
          {authMode === "verify" && (
            <div className="space-y-6 text-center">
              <div className="mx-auto w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-display font-bold text-xl text-white">Email Verification Processed</h2>
                <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                  Cryptographic verification token accepted by LoginSystem API. Your account has been validated and authorized for platform sign-in.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                Proceed to Sign In
              </button>
            </div>
          )}

        </div>

        {/* Endpoint configuration - lets you fix a wrong URL without clearing storage manually */}
        {onOpenSettings && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={onOpenSettings}
              className="text-[11px] text-slate-500 hover:text-slate-300 font-mono transition-colors underline underline-offset-2"
            >
              Change API endpoints
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
