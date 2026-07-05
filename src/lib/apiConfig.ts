// ==========================================
// CONFIGURABLE BACKEND ENDPOINTS
// ==========================================
// This app talks to two independent .NET APIs:
//   - LoginSystem: auth, organizations, users
//   - QuizSystem.Api (the "Quiz API"): question groups, folders, questions,
//     options, quizzes, admin views, student views, answers
//
// Both URLs are configurable at runtime (Settings screen -> localStorage),
// falling back to build-time env vars if nothing's been set yet. This means
// the same build can point at local dev APIs, a staging deploy, or
// production just by changing these values in the browser - no rebuild.

const STORAGE_KEYS = {
  loginSystem: "config:loginSystemUrl",
  quizApi: "config:quizApiUrl",
} as const;

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export function getLoginSystemUrl(): string {
  const stored = localStorage.getItem(STORAGE_KEYS.loginSystem);
  const value = stored || import.meta.env.VITE_LOGIN_SYSTEM_URL || "";
  return stripTrailingSlash(value);
}

export function getQuizApiUrl(): string {
  const stored = localStorage.getItem(STORAGE_KEYS.quizApi);
  const value = stored || import.meta.env.VITE_QUIZ_API_URL || "";
  return stripTrailingSlash(value);
}

export function setApiUrls(loginSystemUrl: string, quizApiUrl: string): void {
  localStorage.setItem(STORAGE_KEYS.loginSystem, stripTrailingSlash(loginSystemUrl.trim()));
  localStorage.setItem(STORAGE_KEYS.quizApi, stripTrailingSlash(quizApiUrl.trim()));
}

export function isApiConfigured(): boolean {
  return Boolean(getLoginSystemUrl() && getQuizApiUrl());
}

export function clearApiUrls(): void {
  localStorage.removeItem(STORAGE_KEYS.loginSystem);
  localStorage.removeItem(STORAGE_KEYS.quizApi);
}

// Every path LoginSystem owns. Everything else goes to the Quiz API.
const LOGIN_SYSTEM_PREFIXES = ["/api/auth", "/api/organizations", "/api/users"];

export function resolveBaseUrl(path: string): string {
  const isLoginSystemRoute = LOGIN_SYSTEM_PREFIXES.some((prefix) => path.startsWith(prefix));
  return isLoginSystemRoute ? getLoginSystemUrl() : getQuizApiUrl();
}

export function buildUrl(path: string): string {
  const base = resolveBaseUrl(path);
  if (!base) {
    throw new Error(
      `No API URL configured for "${path}". Go to Settings and enter your LoginSystem and Quiz API URLs.`
    );
  }
  return `${base}${path}`;
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
