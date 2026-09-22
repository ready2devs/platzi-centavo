import {
  IBudgetRepository,
  Budget,
  BudgetFilters,
  defaultBudgetRepository
} from '../repositories/budgetRepository.js';
import { logger } from '../utils/logger.js';

export class BudgetError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
    public readonly code: string = 'BUDGET_ERROR'
  ) {
    super(message);
    this.name = 'BudgetError';
  }
}

export interface CreateBudgetDTO {
  category: string;
  limitAmount: number;
  period: string;
  description?: string;
}

export interface ListBudgetsDTO {
  category?: string;
  period?: string;
}

export class BudgetService {
  constructor(
    private readonly budgetRepository: IBudgetRepository = defaultBudgetRepository
  ) {}

  /**
   * Registra un nuevo presupuesto por categoría y periodo.
   * El monto límite siempre debe ser un número positivo mayor a cero.
   */
  async createBudget(dto: CreateBudgetDTO): Promise<Budget> {
    if (dto.limitAmount <= 0) {
      throw new BudgetError('El monto límite debe ser un número positivo mayor a cero', 400, 'INVALID_AMOUNT');
    }

    const budget = await this.budgetRepository.create({
      category: dto.category,
      limitAmount: dto.limitAmount,
      period: dto.period,
      description: dto.description
    });

    logger.info('Presupuesto registrado exitosamente', {
      id: budget.id,
      category: budget.category,
      limitAmount: budget.limitAmount,
      period: budget.period
    });

    return budget;
  }

  /**
   * Lista presupuestos con filtros opcionales de categoría y periodo.
   */
  async listBudgets(filters?: ListBudgetsDTO): Promise<Budget[]> {
    const budgets = await this.budgetRepository.findAll(filters);

    logger.debug('Presupuestos listados', {
      count: budgets.length,
      filters
    });

    return budgets;
  }
}

export const budgetService = new BudgetService();
