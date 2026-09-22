import { LoginCredentials, AuthSession } from '../types/auth';
import { request } from './apiClient';

const TOKEN_KEY = 'centavo_auth_token';
const USER_KEY = 'centavo_auth_user';

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    // Si hay una URL de API configurada, llamamos al auth-service
    try {
      const response = await request<{ data: AuthSession }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      const session = response.data;
      localStorage.setItem(TOKEN_KEY, session.token);
      localStorage.setItem(USER_KEY, JSON.stringify(session.user));
      return session;
    } catch (err) {
      console.warn('Fallo al conectar con auth-service, verificando fallback:', err);
      if (!credentials.email || !credentials.password) {
        throw new Error('Por favor ingresa correo y contraseña.');
      }
      // Si el error es de credenciales inválidas del backend, lanzarlo directamente
      if (err instanceof Error && err.message) {
        throw err;
      }
    }

    // Fallback de desarrollo para scaffold local sin microservicio levantado
    await new Promise((resolve) => setTimeout(resolve, 600));

    if (!credentials.email || !credentials.password) {
      throw new Error('Por favor ingresa correo y contraseña.');
    }

    if (credentials.password.length < 4) {
      throw new Error('La contraseña debe tener al menos 4 caracteres.');
    }

    const mockSession: AuthSession = {
      token: 'mock-jwt-centavo-token',
      user: {
        id: 'usr_1',
        email: credentials.email,
        name: credentials.email.split('@')[0] || 'Usuario Centavo',
      },
    };

    localStorage.setItem(TOKEN_KEY, mockSession.token);
    localStorage.setItem(USER_KEY, JSON.stringify(mockSession.user));
    return mockSession;
  },

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getCurrentSession(): AuthSession | null {
    const token = localStorage.getItem(TOKEN_KEY);
    const userStr = localStorage.getItem(USER_KEY);
    if (!token || !userStr) return null;

    try {
      const user = JSON.parse(userStr);
      return { token, user };
    } catch {
      this.logout();
      return null;
    }
  },
};
