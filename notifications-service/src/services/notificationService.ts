import {
  INotificationRepository,
  Notification,
  NotificationFilters,
  NotificationType,
  defaultNotificationRepository
} from '../repositories/notificationRepository.js';
import { IBudgetProvider, defaultBudgetProvider } from './budgetProvider.js';
import { logger } from '../utils/logger.js';

export class NotificationError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
    public readonly code: string = 'NOTIFICATION_ERROR'
  ) {
    super(message);
    this.name = 'NotificationError';
  }
}

export interface TransactionEventDTO {
  transactionId: string;
  amount: number;
  category: string;
  date: string;
  description?: string;
  currentSpent?: number;
  budgetLimit?: number;
}

export interface ProcessEventResult {
  alertGenerated: boolean;
  notification: Notification | null;
  reason?: string;
}

export class NotificationService {
  constructor(
    private readonly notificationRepository: INotificationRepository = defaultNotificationRepository,
    private readonly budgetProvider: IBudgetProvider = defaultBudgetProvider
  ) {}

  /**
   * Procesa un evento de nueva transacción y determina contra el presupuesto si genera alerta de sobregasto.
   */
  async processTransactionEvent(dto: TransactionEventDTO): Promise<ProcessEventResult> {
    if (dto.amount <= 0) {
      throw new NotificationError('El monto de la transacción debe ser mayor a cero', 400, 'INVALID_AMOUNT');
    }

    const category = dto.category.trim();
    let budgetLimit = dto.budgetLimit;

    // Si no vino explícito en el evento, intentamos obtenerlo del proveedor de presupuestos
    if (budgetLimit === undefined) {
      const budgetInfo = await this.budgetProvider.getBudgetByCategory(category);
      if (budgetInfo) {
        budgetLimit = budgetInfo.limitAmount;
      }
    }

    // Si no existe presupuesto asignado para esta categoría, no se genera alerta de sobregasto
    if (budgetLimit === undefined || budgetLimit <= 0) {
      logger.info(`Evento de transacción evaluado: la categoría "${category}" no tiene presupuesto definido`, {
        transactionId: dto.transactionId,
        category
      });
      return {
        alertGenerated: false,
        notification: null,
        reason: 'NO_BUDGET_FOUND'
      };
    }

    const priorSpent = dto.currentSpent ?? 0;
    const totalSpent = priorSpent + dto.amount;

    // Evaluamos si el gasto acumulado alcanza o supera el límite del presupuesto
    if (totalSpent >= budgetLimit) {
      const overspentAmount = Math.max(0, totalSpent - budgetLimit);
      const percentage = (totalSpent / budgetLimit) * 100;
      const formattedTotal = totalSpent.toFixed(2);
      const formattedLimit = budgetLimit.toFixed(2);
      const formattedPercentage = percentage.toFixed(1);

      const message = totalSpent > budgetLimit
        ? `¡Alerta de sobregasto en ${category}! Has superado tu presupuesto de $${formattedLimit} con un gasto total de $${formattedTotal} (${formattedPercentage}%).`
        : `¡Alerta de límite alcanzado en ${category}! Has alcanzado el 100% de tu presupuesto de $${formattedLimit}.`;

      const notification = await this.notificationRepository.create({
        type: 'OVERSPENT_ALERT',
        category,
        transactionId: dto.transactionId,
        amount: dto.amount,
        budgetLimit,
        currentSpent: totalSpent,
        overspentAmount,
        percentage,
        message
      });

      logger.warn('Alerta de sobregasto generada exitosamente', {
        id: notification.id,
        category,
        transactionId: dto.transactionId,
        budgetLimit,
        totalSpent,
        percentage: `${formattedPercentage}%`
      });

      return {
        alertGenerated: true,
        notification
      };
    }

    logger.info('Evento de transacción evaluado: gasto dentro del presupuesto asignado', {
      transactionId: dto.transactionId,
      category,
      totalSpent,
      budgetLimit
    });

    return {
      alertGenerated: false,
      notification: null,
      reason: 'WITHIN_BUDGET'
    };
  }

  /**
   * Consulta el listado de notificaciones con filtros opcionales.
   */
  async listNotifications(filters?: NotificationFilters): Promise<Notification[]> {
    return this.notificationRepository.findAll(filters);
  }

  /**
   * Obtiene una notificación por su ID.
   */
  async getNotificationById(id: string): Promise<Notification | null> {
    return this.notificationRepository.findById(id);
  }

  /**
   * Marca una notificación como leída.
   */
  async markAsRead(id: string): Promise<Notification | null> {
    return this.notificationRepository.markAsRead(id);
  }
}

export const notificationService = new NotificationService();
