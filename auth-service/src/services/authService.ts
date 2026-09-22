import { IUserRepository, defaultUserRepository, SafeUser } from '../repositories/userRepository.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { sessionValidator, SessionValidator, SessionUser } from '../modules/session/sessionValidator.js';
import { logger } from '../utils/logger.js';

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
    public readonly code: string = 'AUTH_ERROR'
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export interface RegisterDTO {
  email: string;
  password: string;
  name: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: SafeUser;
  token: string;
}

export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository = defaultUserRepository,
    private readonly sessionVal: SessionValidator = sessionValidator
  ) {}

  /**
   * Registra un nuevo usuario con contraseña hasheada (bcrypt 12 rondas).
   */
  async register(dto: RegisterDTO): Promise<AuthResponse> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const existingUser = await this.userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      logger.warn('Intento de registro con email ya existente', { email: normalizedEmail });
      throw new AuthError('El correo electrónico ya está registrado', 409, 'EMAIL_ALREADY_EXISTS');
    }

    const passwordHash = await hashPassword(dto.password);

    const user = await this.userRepository.create({
      email: normalizedEmail,
      name: dto.name.trim(),
      passwordHash
    });

    const token = this.sessionVal.generateSessionToken({
      userId: user.id,
      email: user.email
    });

    logger.info('Usuario registrado exitosamente', { userId: user.id, email: user.email });

    const safeUser: SafeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return { user: safeUser, token };
  }

  /**
   * Autentica un usuario verificando sus credenciales de manera segura.
   */
  async login(dto: LoginDTO): Promise<AuthResponse> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const user = await this.userRepository.findByEmail(normalizedEmail);
    if (!user) {
      // Mensaje genérico para evitar enumeración de usuarios
      logger.warn('Intento de login fallido: usuario no encontrado', { email: normalizedEmail });
      throw new AuthError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      logger.warn('Intento de login con cuenta inactiva', { userId: user.id });
      throw new AuthError('La cuenta de usuario se encuentra inactiva', 403, 'USER_INACTIVE');
    }

    const isPasswordValid = await comparePassword(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      logger.warn('Intento de login fallido: contraseña incorrecta', { userId: user.id });
      throw new AuthError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
    }

    const token = this.sessionVal.generateSessionToken({
      userId: user.id,
      email: user.email
    });

    logger.info('Inicio de sesión exitoso', { userId: user.id });

    const safeUser: SafeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return { user: safeUser, token };
  }

  /**
   * Valida la sesión a través del módulo central único sessionValidator.
   */
  async verifySession(authHeaderOrToken?: string): Promise<{ valid: boolean; user: SessionUser }> {
    const result = await this.sessionVal.validateSession(authHeaderOrToken);
    return result;
  }

  /**
   * Obtiene la información del usuario autenticado a partir de su ID.
   */
  async getUserProfile(userId: string): Promise<SafeUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AuthError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}

export const authService = new AuthService();
