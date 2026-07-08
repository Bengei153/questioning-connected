// Matches LoginSystem's real UserResponse (GET /api/users, /api/users/me).
// No FullName field exists on the backend's User entity - display name is
// always the username.
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: "SuperAdmin" | "OrgAdmin" | "Student";
  organizationId: string | null;
  status: "Pending" | "Active" | "Locked" | "Suspended" | "Disabled";
}

// Matches LoginSystem's real AuthResponse (POST /api/auth/login, /api/auth/refresh).
export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  userId: string;
  username: string;
  role: "SuperAdmin" | "OrgAdmin" | "Student";
  organizationId: string | null;
}

export interface Organization {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface QuestionGroup {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  status: "Live" | "Draft";
  createdAt: string;
}

export interface Folder {
  id: string;
  groupId: string;
  name: string;
  description: string;
}

export interface Option {
  id: string;
  questionId: string;
  text: string;
  isCorrect: boolean;
  image: string | null;
}

export interface Question {
  id: string;
  folderId: string;
  text: string;
  type: "Multiple Choice" | "Multi-Select";
  points: number;
  image: string | null;
  createdAt: string;
  options?: Option[];
}

export interface QuizAttempt {
  id: string;
  studentId: string;
  groupId: string;
  score: number;
  completed: boolean;
  answers: Record<string, string[]>;
  createdAt: string;
  groupName?: string;
}

export interface SystemLog {
  id: string;
  message: string;
  severity: "info" | "warning" | "error";
  timestamp: string;
}
