import express, { Express } from 'express';
import cors from 'cors';
import { authRouter } from './routes/authRoutes.js';
import { requestLogger } from './middlewares/requestLogger.js';

export function createApp(): Express {
  const app = express();

  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  app.use(express.json());
  app.use(requestLogger);

  // Health check
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'auth-service', timestamp: new Date().toISOString() });
  });

  // Rutas de autenticación
  app.use('/api/auth', authRouter);

  // 404 Handler
  app.use((_req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Ruta no encontrada'
      }
    });
  });

  return app;
}
