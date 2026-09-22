import { Request, Response } from 'express';
import { z } from 'zod';
import { notificationService, NotificationError } from '../services/notificationService.js';
import { logger } from '../utils/logger.js';

const transactionEventSchema = z.object({
  transactionId: z
    .string({ required_error: 'El ID de la transacción es requerido' })
    .trim()
    .min(1, 'El ID de la transacción no puede estar vacío'),
  amount: z
    .number({ required_error: 'El monto es requerido', invalid_type_error: 'El monto debe ser un número' })
    .positive('El monto debe ser un número positivo mayor a cero'),
  category: z
    .string({ required_error: 'La categoría es requerida', invalid_type_error: 'La categoría debe ser una cadena de texto' })
    .trim()
    .min(1, 'La categoría no puede estar vacía'),
  date: z
    .string({ required_error: 'La fecha es requerida' })
    .trim()
    .min(1, 'La fecha no puede estar vacía'),
  description: z.string().optional(),
  currentSpent: z
    .number({ invalid_type_error: 'El gasto acumulado debe ser un número' })
    .nonnegative('El gasto previo acumulado no puede ser negativo')
    .optional(),
  budgetLimit: z
    .number({ invalid_type_error: 'El límite de presupuesto debe ser un número' })
    .positive('El límite de presupuesto debe ser mayor a cero')
    .optional()
});

const listNotificationsQuerySchema = z.object({
  category: z.string().trim().min(1).optional(),
  type: z.enum(['OVERSPENT_ALERT', 'BUDGET_WARNING']).optional(),
  read: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional()
});

export class NotificationController {
  /**
   * POST /api/notifications/events/transaction
   * Recibe un evento de nueva transacción y determina si se debe generar alerta de sobregasto.
   */
  async handleTransactionEvent(req: Request, res: Response): Promise<void> {
    try {
      const parseResult = transactionEventSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Datos del evento de transacción inválidos',
            details: parseResult.error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message
            }))
          }
        });
        return;
      }

      const result = await notificationService.processTransactionEvent(parseResult.data);

      if (result.alertGenerated) {
        res.status(201).json({
          message: 'Alerta de sobregasto generada',
          alertGenerated: true,
          data: result.notification
        });
        return;
      }

      res.status(200).json({
        message: 'Transacción evaluada, no requiere alerta de sobregasto',
        alertGenerated: false,
        data: null,
        reason: result.reason
      });
    } catch (error: unknown) {
      if (error instanceof NotificationError) {
        res.status(error.statusCode).json({
          error: {
            code: error.code,
            message: error.message
          }
        });
        return;
      }

      logger.error('Error no controlado al procesar evento de transacción', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Ocurrió un error interno en el servidor'
        }
      });
    }
  }

  /**
   * GET /api/notifications
   * Lista notificaciones y alertas con filtros opcionales (category, type, read).
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const parseResult = listNotificationsQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Parámetros de consulta inválidos',
            details: parseResult.error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message
            }))
          }
        });
        return;
      }

      const notifications = await notificationService.listNotifications(parseResult.data);

      res.status(200).json({
        data: notifications,
        total: notifications.length
      });
    } catch (error: unknown) {
      logger.error('Error no controlado al listar notificaciones', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Ocurrió un error interno en el servidor'
        }
      });
    }
  }

  /**
   * GET /api/notifications/:id
   * Obtiene los detalles de una alerta por su identificador.
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const notification = await notificationService.getNotificationById(id);

      if (!notification) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: `Notificación con id "${id}" no encontrada`
          }
        });
        return;
      }

      res.status(200).json({
        data: notification
      });
    } catch (error: unknown) {
      logger.error('Error no controlado al consultar notificación', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Ocurrió un error interno en el servidor'
        }
      });
    }
  }

  /**
   * PATCH /api/notifications/:id/read
   * Marca una notificación como leída.
   */
  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const notification = await notificationService.markAsRead(id);

      if (!notification) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: `Notificación con id "${id}" no encontrada`
          }
        });
        return;
      }

      res.status(200).json({
        message: 'Notificación marcada como leída',
        data: notification
      });
    } catch (error: unknown) {
      logger.error('Error no controlado al marcar notificación como leída', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Ocurrió un error interno en el servidor'
        }
      });
    }
  }
}

export const notificationController = new NotificationController();
