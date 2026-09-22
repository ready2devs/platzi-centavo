import {
  ITransactionRepository,
  Transaction,
  TransactionFilters,
  defaultTransactionRepository
} from '../repositories/transactionRepository.js';
import { logger } from '../utils/logger.js';

export class TransactionError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
    public readonly code: string = 'TRANSACTION_ERROR'
  ) {
    super(message);
    this.name = 'TransactionError';
  }
}

export interface CreateTransactionDTO {
  amount: number;
  category: string;
  date: string;
  description?: string;
}

export interface ListTransactionsDTO {
  category?: string;
  startDate?: string;
  endDate?: string;
}

export class TransactionService {
  constructor(
    private readonly transactionRepository: ITransactionRepository = defaultTransactionRepository
  ) {}

  /**
   * Registra una nueva transacción.
   * El monto siempre debe ser un número positivo.
   */
  async createTransaction(dto: CreateTransactionDTO): Promise<Transaction> {
    if (dto.amount <= 0) {
      throw new TransactionError('El monto debe ser un número positivo mayor a cero', 400, 'INVALID_AMOUNT');
    }

    const transaction = await this.transactionRepository.create({
      amount: dto.amount,
      category: dto.category,
      date: dto.date,
      description: dto.description
    });

    logger.info('Transacción registrada exitosamente', {
      id: transaction.id,
      amount: transaction.amount,
      category: transaction.category,
      date: transaction.date
    });

    return transaction;
  }

  /**
   * Lista transacciones con filtros opcionales de categoría y rango de fechas.
   */
  async listTransactions(filters?: ListTransactionsDTO): Promise<Transaction[]> {
    const transactions = await this.transactionRepository.findAll(filters);

    logger.debug('Transacciones listadas', {
      count: transactions.length,
      filters
    });

    return transactions;
  }
}

export const transactionService = new TransactionService();
