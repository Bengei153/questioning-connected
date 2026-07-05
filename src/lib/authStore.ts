import { create } from "zustand";
import { AuthResponse } from "../types";
import { buildUrl } from "./apiConfig";

// NOTE: LoginSystem's real /api/auth/login and /api/auth/refresh responses
// do NOT include a display name - the User entity only has Username/Email.
// Email is fetched separately via GET /api/users/me after auth succeeds.
interface AuthUser {
  userId: string;
  username: string;
  role: "SuperAdmin" | "OrgAdmin" | "Student";
  organizationId: string | null;
  email: string | null;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  initialized: boolean;
  setAuth: (auth: AuthResponse | null) => void;
  setEmail: (email: string) => void;
  initializeAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

// In-memory access token storage - never touches localStorage/sessionStorage.
let memAccessToken: string | null = null;

function userFromAuthResponse(auth: AuthResponse): AuthUser {
  return {
    userId: auth.userId,
    username: auth.username,
    role: auth.role,
    organizationId: auth.organizationId,
    email: null,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  initialized: false,

  setAuth: (auth) => {
    if (auth) {
      memAccessToken = auth.accessToken;
      sessionStorage.setItem("refreshToken", auth.refreshToken);
      set({
        accessToken: auth.accessToken,
        user: userFromAuthResponse(auth),
        initialized: true,
      });
      // Login/refresh responses don't carry email - fetch the profile separately.
      hydrateProfile();
    } else {
      memAccessToken = null;
      sessionStorage.removeItem("refreshToken");
      set({ accessToken: null, user: null, initialized: true });
    }
  },

  setEmail: (email) => {
    const current = get().user;
    if (current) set({ user: { ...current, email } });
  },

  initializeAuth: async () => {
    const storedRefresh = sessionStorage.getItem("refreshToken");
    if (!storedRefresh) {
      set({ initialized: true });
      return;
    }

    try {
      const res = await fetch(buildUrl("/api/auth/refresh"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: storedRefresh }),
      });

      if (res.ok) {
        const data: AuthResponse = await res.json();
        memAccessToken = data.accessToken;
        sessionStorage.setItem("refreshToken", data.refreshToken);
        set({
          accessToken: data.accessToken,
          user: userFromAuthResponse(data),
          initialized: true,
        });
        hydrateProfile();
      } else {
        sessionStorage.removeItem("refreshToken");
        set({ accessToken: null, user: null, initialized: true });
      }
    } catch {
      // API not configured yet, or unreachable - fall through to login screen.
      set({ initialized: true });
    }
  },

  logout: async () => {
    memAccessToken = null;
    sessionStorage.removeItem("refreshToken");
    set({ accessToken: null, user: null });
  },
}));

// Fetches /api/users/me and fills in the email once we have a token.
// Fire-and-forget: a failure here shouldn't block the user from using the app.
async function hydrateProfile() {
  try {
    const res = await apiFetch("/api/users/me");
    if (res.ok) {
      const profile = await res.json();
      useAuthStore.getState().setEmail(profile.email ?? "");
    }
  } catch (err) {
    console.error("Could not load profile", err);
  }
}

// ==========================================
// INTERCEPTING SECURE API FETCHER
// ==========================================

let isRefreshing = false;
let refreshQueue: ((token: string) => void)[] = [];

async function handleSilentRefresh(): Promise<string | null> {
  const storedRefresh = sessionStorage.getItem("refreshToken");
  if (!storedRefresh) return null;

  try {
    const res = await fetch(buildUrl("/api/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: storedRefresh }),
    });

    if (res.ok) {
      const data: AuthResponse = await res.json();
      memAccessToken = data.accessToken;
      sessionStorage.setItem("refreshToken", data.refreshToken);
      useAuthStore.setState({ accessToken: data.accessToken, user: userFromAuthResponse(data) });
      return data.accessToken;
    }
  } catch (err) {
    console.error("Silent refresh error", err);
  }

  useAuthStore.getState().logout();
  return null;
}

// path is a relative API path, e.g. "/api/auth/login" or "/api/questiongroup/123".
// buildUrl() decides which of the two backends it actually goes to.
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});
  if (memAccessToken) {
    headers.set("Authorization", `Bearer ${memAccessToken}`);
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const updatedOptions = { ...options, headers };
  const url = buildUrl(path);

  let response = await fetch(url, updatedOptions);

  if (response.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await handleSilentRefresh();
      isRefreshing = false;

      if (newToken) {
        refreshQueue.forEach((callback) => callback(newToken));
        refreshQueue = [];

        const retryHeaders = new Headers(updatedOptions.headers);
        retryHeaders.set("Authorization", `Bearer ${newToken}`);
        return fetch(url, { ...updatedOptions, headers: retryHeaders });
      } else {
        refreshQueue = [];
        return response;
      }
    } else {
      return new Promise((resolve) => {
        refreshQueue.push((token) => {
          const retryHeaders = new Headers(updatedOptions.headers);
          retryHeaders.set("Authorization", `Bearer ${token}`);
          resolve(fetch(url, { ...updatedOptions, headers: retryHeaders }));
        });
      });
    }
  }

  return response;
}
