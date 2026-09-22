export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthSession {
  user: User;
  token: string;
}

export interface AuthResponse {
  success: boolean;
  data?: AuthSession;
  error?: string;
}
