import { logger } from '../../utils/logger.js';

export interface RemoteTransaction {
  id: string;
  amount: number;
  category: string;
  date: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_RECORDED_TRANSACTIONS: RemoteTransaction[] = [
  {
    id: 'txn_1',
    amount: 1200,
    category: 'food',
    date: '2026-09-10T12:00:00.000Z',
    description: 'Supermercado'
  },
  {
    id: 'txn_2',
    amount: 800,
    category: 'food',
    date: '2026-09-15T15:30:00.000Z',
    description: 'Restaurante'
  },
  {
    id: 'txn_3',
    amount: 500,
    category: 'transport',
    date: '2026-09-18T09:00:00.000Z',
    description: 'Combustible'
  },
  {
    id: 'txn_4',
    amount: 300,
    category: 'entertainment',
    date: '2026-09-20T20:00:00.000Z',
    description: 'Cine'
  }
];

export interface ITransactionsClient {
  getTransactions(params?: { startDate?: string; endDate?: string; category?: string }): Promise<RemoteTransaction[]>;
}

export class HttpTransactionsClient implements ITransactionsClient {
  constructor(
    private readonly baseUrl: string = process.env.TRANSACTIONS_SERVICE_URL || 'http://localhost:3002'
  ) {}

  async getTransactions(params?: { startDate?: string; endDate?: string; category?: string }): Promise<RemoteTransaction[]> {
    const url = new URL('/api/transactions', this.baseUrl);
    if (params?.startDate) url.searchParams.set('startDate', params.startDate);
    if (params?.endDate) url.searchParams.set('endDate', params.endDate);
    if (params?.category) url.searchParams.set('category', params.category);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`Transactions service returned status ${response.status}`);
      }

      const body = await response.json() as { data: RemoteTransaction[]; total: number };
      return body.data || [];
    } catch (error) {
      logger.warn(`Transactions-service no disponible en ${url.toString()}. Utilizando transacciones registradas de respaldo.`, error);
      let list = [...DEFAULT_RECORDED_TRANSACTIONS];
      if (params?.category) {
        const cat = params.category.toLowerCase().trim();
        list = list.filter(t => t.category.toLowerCase() === cat);
      }
      if (params?.startDate) {
        const start = new Date(params.startDate).getTime();
        list = list.filter(t => new Date(t.date).getTime() >= start);
      }
      if (params?.endDate) {
        const end = new Date(params.endDate).getTime();
        list = list.filter(t => new Date(t.date).getTime() <= end);
      }
      return list;
    }
  }
}

export const defaultTransactionsClient = new HttpTransactionsClient();
