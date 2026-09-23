import { logger } from '../../utils/logger.js';

export interface RemoteBudget {
  id: string;
  category: string;
  limitAmount: number;
  period: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_RECORDED_BUDGETS: RemoteBudget[] = [
  {
    id: 'bgt_1',
    category: 'food',
    limitAmount: 2500,
    period: 'monthly',
    description: 'Presupuesto mensual para alimentación'
  },
  {
    id: 'bgt_2',
    category: 'transport',
    limitAmount: 400,
    period: 'monthly',
    description: 'Presupuesto mensual para transporte y combustible'
  }
];

export interface IBudgetsClient {
  getBudgets(params?: { period?: string; category?: string }): Promise<RemoteBudget[]>;
}

export class HttpBudgetsClient implements IBudgetsClient {
  constructor(
    private readonly baseUrl: string = process.env.BUDGETS_SERVICE_URL || 'http://localhost:3003'
  ) {}

  async getBudgets(params?: { period?: string; category?: string }): Promise<RemoteBudget[]> {
    const url = new URL('/api/budgets', this.baseUrl);
    if (params?.period) url.searchParams.set('period', params.period);
    if (params?.category) url.searchParams.set('category', params.category);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`Budgets service returned status ${response.status}`);
      }

      const body = await response.json() as { data: RemoteBudget[]; total: number };
      return body.data || [];
    } catch (error) {
      logger.warn(`Budgets-service no disponible en ${url.toString()}. Utilizando presupuestos registrados de respaldo.`, error);
      let list = [...DEFAULT_RECORDED_BUDGETS];
      if (params?.category) {
        const cat = params.category.toLowerCase().trim();
        list = list.filter(b => b.category.toLowerCase() === cat);
      }
      if (params?.period) {
        const per = params.period.toLowerCase().trim();
        list = list.filter(b => b.period.toLowerCase() === per);
      }
      return list;
    }
  }
}

export const defaultBudgetsClient = new HttpBudgetsClient();
