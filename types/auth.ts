/**
 * Authentication Types
 * Used for login, signup, and user management flows
 */

export type UserRole = 'student' | 'teacher' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatar?: string;
  university?: string;
  createdAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface StudentSignupData extends LoginCredentials {
  fullName: string;
  enrollmentNumber: string;
  university: string;
  avatar?: string;
  confirmPassword: string;
}

export interface TeacherSignupData extends LoginCredentials {
  fullName: string;
  university: string;
  avatar?: string;
  confirmPassword: string;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  token?: string;
  message?: string;
  errors?: Record<string, string>;
}

export interface University {
  id: string;
  name: string;
  code: string;
}
