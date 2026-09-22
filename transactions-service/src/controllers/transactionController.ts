import { Request, Response } from 'express';
import { z } from 'zod';
import { transactionService, TransactionError } from '../services/transactionService.js';
import { logger } from '../utils/logger.js';

const createTransactionSchema = z.object({
  amount: z
    .number({ invalid_type_error: 'El monto debe ser un número' })
    .positive('El monto debe ser un número positivo mayor a cero'),
  category: z
    .string()
    .min(1, 'La categoría no puede estar vacía')
    .max(50, 'La categoría no puede superar los 50 caracteres'),
  date: z
    .string()
    .datetime({ message: 'La fecha debe estar en formato ISO 8601 (ej: 2024-01-15T10:00:00.000Z)' }),
  description: z
    .string()
    .max(255, 'La descripción no puede superar los 255 caracteres')
    .optional()
});

const listTransactionsQuerySchema = z.object({
  category: z.string().min(1).optional(),
  startDate: z.string().datetime({ message: 'startDate debe estar en formato ISO 8601' }).optional(),
  endDate: z.string().datetime({ message: 'endDate debe estar en formato ISO 8601' }).optional()
});

export class TransactionController {
  /**
   * POST /api/transactions
   * Registra una nueva transacción con monto, categoría y fecha.
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const parseResult = createTransactionSchema.safeParse(req.body);
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

      const transaction = await transactionService.createTransaction(parseResult.data);

      res.status(201).json({
        message: 'Transacción registrada exitosamente',
        data: transaction
      });
    } catch (error: unknown) {
      if (error instanceof TransactionError) {
        res.status(error.statusCode).json({
          error: {
            code: error.code,
            message: error.message
          }
        });
        return;
      }

      logger.error('Error no controlado en create transaction', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Ocurrió un error interno en el servidor'
        }
      });
    }
  }

  /**
   * GET /api/transactions
   * Lista transacciones con filtros opcionales: category, startDate, endDate.
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const parseResult = listTransactionsQuerySchema.safeParse(req.query);
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

      const transactions = await transactionService.listTransactions(parseResult.data);

      res.status(200).json({
        data: transactions,
        total: transactions.length
      });
    } catch (error: unknown) {
      logger.error('Error no controlado en list transactions', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Ocurrió un error interno en el servidor'
        }
      });
    }
  }
}

export const transactionController = new TransactionController();
