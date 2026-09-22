import { Request, Response } from 'express';
import { z } from 'zod';
import { budgetService, BudgetError } from '../services/budgetService.js';
import { logger } from '../utils/logger.js';

const createBudgetSchema = z.object({
  category: z
    .string({ required_error: 'La categoría es requerida', invalid_type_error: 'La categoría debe ser una cadena de texto' })
    .trim()
    .min(1, 'La categoría no puede estar vacía')
    .max(50, 'La categoría no puede superar los 50 caracteres'),
  limitAmount: z
    .number({ required_error: 'El monto límite es requerido', invalid_type_error: 'El monto límite debe ser un número' })
    .positive('El monto límite debe ser un número positivo mayor a cero'),
  period: z
    .string({ required_error: 'El periodo es requerido', invalid_type_error: 'El periodo debe ser una cadena de texto' })
    .trim()
    .min(1, 'El periodo no puede estar vacío')
    .max(50, 'El periodo no puede superar los 50 caracteres'),
  description: z
    .string()
    .max(255, 'La descripción no puede superar los 255 caracteres')
    .optional()
});

const listBudgetsQuerySchema = z.object({
  category: z.string().trim().min(1).optional(),
  period: z.string().trim().min(1).optional()
});

export class BudgetController {
  /**
   * POST /api/budgets
   * Registra un nuevo presupuesto por categoría y periodo.
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const parseResult = createBudgetSchema.safeParse(req.body);
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

      const budget = await budgetService.createBudget(parseResult.data);

      res.status(201).json({
        message: 'Presupuesto registrado exitosamente',
        data: budget
      });
    } catch (error: unknown) {
      if (error instanceof BudgetError) {
        res.status(error.statusCode).json({
          error: {
            code: error.code,
            message: error.message
          }
        });
        return;
      }

      logger.error('Error no controlado en create budget', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Ocurrió un error interno en el servidor'
        }
      });
    }
  }

  /**
   * GET /api/budgets
   * Lista presupuestos con filtros opcionales: category, period.
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const parseResult = listBudgetsQuerySchema.safeParse(req.query);
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

      const budgets = await budgetService.listBudgets(parseResult.data);

      res.status(200).json({
        data: budgets,
        total: budgets.length
      });
    } catch (error: unknown) {
      logger.error('Error no controlado en list budgets', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Ocurrió un error interno en el servidor'
        }
      });
    }
  }
}

export const budgetController = new BudgetController();
