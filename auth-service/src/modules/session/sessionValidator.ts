import jwt from 'jsonwebtoken';
import { IUserRepository, defaultUserRepository } from '../../repositories/userRepository.js';

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface SessionUser {
  userId: string;
  email: string;
  name: string;
  isActive: boolean;
}

export class SessionValidationError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 401,
    public readonly code: string = 'INVALID_SESSION'
  ) {
    super(message);
    this.name = 'SessionValidationError';
  }
}

export interface SessionValidationResult {
  valid: true;
  user: SessionUser;
}

/**
 * Módulo Central de Validación de Sesión.
 * Según las reglas de AGENTS.MD:
 * "Toda validación de sesión debe pasar por un solo módulo central."
 *
 * Ningún otro archivo debe decodificar ni validar tokens de sesión directamente.
 */
export class SessionValidator {
  constructor(
    private readonly userRepository: IUserRepository = defaultUserRepository,
    private readonly jwtSecret: string = process.env.JWT_SECRET || 'centavo-default-secret-key-change-in-prod'
  ) {}

  /**
   * Extrae el token del header Authorization (Bearer <token>) o de un string crudo.
   */
  public extractToken(authHeaderOrToken?: string): string {
    if (!authHeaderOrToken || typeof authHeaderOrToken !== 'string') {
      throw new SessionValidationError('Token de sesión no proporcionado', 401, 'MISSING_TOKEN');
    }

    const trimmed = authHeaderOrToken.trim();
    if (trimmed.toLowerCase().startsWith('bearer ')) {
      const parts = trimmed.split(' ');
      if (parts.length === 2 && parts[1].length > 0) {
        return parts[1];
      }
      throw new SessionValidationError('Formato de token Bearer inválido', 401, 'MALFORMED_TOKEN');
    }

    return trimmed;
  }

  /**
   * Valida exhaustivamente el token de sesión y el estado del usuario asociado.
   * Valida:
   * 1. Presencia y formato del token
   * 2. Integridad de firma criptográfica
   * 3. Vigencia temporal (expiración)
   * 4. Existencia del usuario en la base de datos
   * 5. Estado activo del usuario
   *
   * Retorna los datos de sesión limpios y seguros (SessionUser).
   */
  public async validateSession(authHeaderOrToken?: string): Promise<SessionValidationResult> {
    const token = this.extractToken(authHeaderOrToken);

    let decoded: TokenPayload;
    try {
      decoded = jwt.verify(token, this.jwtSecret) as TokenPayload;
    } catch (err: unknown) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new SessionValidationError('La sesión ha expirado', 401, 'SESSION_EXPIRED');
      }
      if (err instanceof jwt.JsonWebTokenError) {
        throw new SessionValidationError('Firma o formato de token inválido', 401, 'INVALID_TOKEN');
      }
      throw new SessionValidationError('Error de validación de sesión', 401, 'VERIFICATION_ERROR');
    }

    if (!decoded || !decoded.userId) {
      throw new SessionValidationError('Payload de sesión inválido', 401, 'INVALID_PAYLOAD');
    }

    const user = await this.userRepository.findById(decoded.userId);
    if (!user) {
      throw new SessionValidationError('Usuario asociado a la sesión no existe', 401, 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new SessionValidationError('La cuenta de usuario se encuentra inactiva', 403, 'USER_INACTIVE');
    }

    return {
      valid: true,
      user: {
        userId: user.id,
        email: user.email,
        name: user.name,
        isActive: user.isActive
      }
    };
  }

  /**
   * Genera un nuevo token firmado para una sesión de usuario.
   */
  public generateSessionToken(payload: TokenPayload, expiresIn: string = process.env.JWT_EXPIRES_IN || '24h'): string {
    return jwt.sign(payload, this.jwtSecret, { expiresIn } as jwt.SignOptions);
  }
}

// Instancia única centralizada
export const sessionValidator = new SessionValidator();
