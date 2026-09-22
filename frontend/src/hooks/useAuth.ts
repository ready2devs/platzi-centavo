import { useState, useCallback } from 'react';
import { LoginCredentials } from '../types/auth';
import { authService } from '../services/authService';

export function useAuth() {
  const [session, setSession] = useState(() => authService.getCurrentSession());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setLoading(true);
    setError(null);
    try {
      const newSession = await authService.login(credentials);
      setSession(newSession);
      return newSession;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ocurrió un error al iniciar sesión';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setSession(null);
    setError(null);
  }, []);

  return {
    user: session?.user ?? null,
    isAuthenticated: Boolean(session?.token),
    loading,
    error,
    login,
    logout,
    clearError: () => setError(null),
  };
}
