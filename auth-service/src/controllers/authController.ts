import { Request, Response } from 'express';
import { z } from 'zod';
import { authService, AuthError } from '../services/authService.js';
import { SessionValidationError } from '../modules/session/sessionValidator.js';
import { logger } from '../utils/logger.js';

const registerSchema = z.object({
  email: z.string().email('Formato de correo electrónico inválido'),
  password: z.string().min(8, 'La contraseña debe contener al menos 8 caracteres'),
  name: z.string().min(2, 'El nombre debe contener al menos 2 caracteres')
});

const loginSchema = z.object({
  email: z.string().email('Formato de correo electrónico inválido'),
  password: z.string().min(1, 'La contraseña es requerida')
});

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const parseResult = registerSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Datos de entrada inválidos',
            details: parseResult.error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message
            }))
          }
        });
        return;
      }

      const result = await authService.register(parseResult.data);
      res.status(201).json({
        message: 'Usuario registrado exitosamente',
        data: result
      });
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({
          error: {
            code: error.code,
            message: error.message
          }
        });
        return;
      }

      logger.error('Error no controlado en register', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Ocurrió un error interno en el servidor'
        }
      });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const parseResult = loginSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Datos de entrada inválidos',
            details: parseResult.error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message
            }))
          }
        });
        return;
      }

      const result = await authService.login(parseResult.data);
      res.status(200).json({
        message: 'Inicio de sesión exitoso',
        data: result
      });
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({
          error: {
            code: error.code,
            message: error.message
          }
        });
        return;
      }

      logger.error('Error no controlado en login', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Ocurrió un error interno en el servidor'
        }
      });
    }
  }

  /**
   * Endpoint específico para verificar el estado de la sesión.
   * Utiliza el header Authorization: Bearer <token>.
   */
  async verifySession(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const result = await authService.verifySession(authHeader);

      res.status(200).json({
        valid: true,
        session: result.user
      });
    } catch (error: unknown) {
      if (error instanceof SessionValidationError) {
        res.status(error.statusCode).json({
          valid: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
        return;
      }

      logger.error('Error no controlado en verifySession', error);
      res.status(500).json({
        valid: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error al verificar la sesión'
        }
      });
    }
  }

  /**
   * Obtiene el perfil del usuario autenticado (requiere middleware requireAuth previo).
   */
  async getMe(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'No autenticado'
          }
        });
        return;
      }

      const profile = await authService.getUserProfile(req.user.userId);
      res.status(200).json({
        user: profile
      });
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({
          error: {
            code: error.code,
            message: error.message
          }
        });
        return;
      }

      logger.error('Error al obtener perfil me', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error interno al consultar perfil'
        }
      });
    }
  }
}

export const authController = new AuthController();
