import { Request, Response, NextFunction } from 'express';
import { sessionValidator, SessionUser, SessionValidationError } from './sessionValidator.js';
import { logger } from '../../utils/logger.js';

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

/**
 * Middleware Express para proteger rutas que requieren sesión activa.
 * Delega estrictamente en el módulo central sessionValidator.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const { user } = await sessionValidator.validateSession(authHeader);
    req.user = user;
    next();
  } catch (error: unknown) {
    if (error instanceof SessionValidationError) {
      logger.warn('Intento de acceso denegado por fallo de sesión', {
        path: req.path,
        method: req.method,
        code: error.code,
        message: error.message
      });
      res.status(error.statusCode).json({
        error: {
          code: error.code,
          message: error.message
        }
      });
      return;
    }

    logger.error('Error inesperado durante validación de sesión', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error interno al validar sesión'
      }
    });
  }
}
