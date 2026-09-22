import { Router } from 'express';
import { notificationController } from '../controllers/notificationController.js';

export const notificationRouter = Router();

// POST /api/notifications/events/transaction — Procesa evento de nueva transacción
notificationRouter.post('/events/transaction', (req, res) => notificationController.handleTransactionEvent(req, res));

// GET /api/notifications — Lista notificaciones y alertas
notificationRouter.get('/', (req, res) => notificationController.list(req, res));

// GET /api/notifications/:id — Consulta una notificación por id
notificationRouter.get('/:id', (req, res) => notificationController.getById(req, res));

// PATCH /api/notifications/:id/read — Marca una notificación como leída
notificationRouter.patch('/:id/read', (req, res) => notificationController.markAsRead(req, res));
