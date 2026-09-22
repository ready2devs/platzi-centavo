import { logger } from '../utils/logger.js';

export interface BudgetInfo {
  id?: string;
  category: string;
  limitAmount: number;
  period?: string;
}

export interface IBudgetProvider {
  getBudgetByCategory(category: string): Promise<BudgetInfo | null>;
}

export class HttpBudgetProvider implements IBudgetProvider {
  constructor(
    private readonly baseUrl: string = process.env.BUDGETS_SERVICE_URL || 'http://localhost:3003'
  ) {}

  async getBudgetByCategory(category: string): Promise<BudgetInfo | null> {
    try {
      const url = `${this.baseUrl}/api/budgets?category=${encodeURIComponent(category.trim())}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(3000)
      });

      if (!response.ok) {
        logger.warn(`No se pudo obtener el presupuesto para la categoría "${category}". Status: ${response.status}`);
        return null;
      }

      const body = await response.json() as { data?: Array<{ id: string; category: string; limitAmount: number; period: string }> };
      if (body.data && body.data.length > 0) {
        const found = body.data[0];
        return {
          id: found.id,
          category: found.category,
          limitAmount: found.limitAmount,
          period: found.period
        };
      }

      return null;
    } catch (error: unknown) {
      logger.warn(`Error al consultar presupuestos en ${this.baseUrl} para la categoría "${category}"`, error);
      return null;
    }
  }
}

export const defaultBudgetProvider = new HttpBudgetProvider();
