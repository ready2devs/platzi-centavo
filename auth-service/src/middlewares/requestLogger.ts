import { Request, Response, NextFunction } from 'express';
import { logger, sanitizeObject } from '../utils/logger.js';

/**
 * Middleware para registrar peticiones HTTP sanitizando cualquier dato sensible
 * (credenciales, contraseñas, tokens y headers de autorización).
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  // Registrar inicio de la petición sin cuerpos ni headers sensibles
  logger.info(`--> ${method} ${originalUrl}`, {
    ip,
    query: sanitizeObject(req.query),
    // Sanitizamos el body explícitamente
    body: sanitizeObject(req.body)
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    logger.info(`<-- ${method} ${originalUrl} [${statusCode}] ${duration}ms`);
  });

  next();
}
