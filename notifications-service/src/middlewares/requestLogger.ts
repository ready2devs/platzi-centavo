import { Request, Response, NextFunction } from 'express';
import { logger, sanitizeObject } from '../utils/logger.js';

/**
 * Middleware para registrar peticiones HTTP sanitizando cualquier dato sensible.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  logger.info(`--> ${method} ${originalUrl}`, {
    ip,
    query: sanitizeObject(req.query),
    body: sanitizeObject(req.body)
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    logger.info(`<-- ${method} ${originalUrl} [${statusCode}] ${duration}ms`);
  });

  next();
}
