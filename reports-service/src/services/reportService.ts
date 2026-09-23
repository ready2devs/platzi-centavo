import {
  IReportRepository,
  ReportContent,
  ReportMetadata,
  CategorySummary,
  defaultReportRepository
} from '../repositories/reportRepository.js';
import {
  ITransactionsClient,
  defaultTransactionsClient
} from './clients/transactionsClient.js';
import {
  IBudgetsClient,
  defaultBudgetsClient
} from './clients/budgetsClient.js';
import { logger } from '../utils/logger.js';

export class ReportError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
    public readonly code: string = 'REPORT_ERROR'
  ) {
    super(message);
    this.name = 'ReportError';
  }
}

export interface GenerateReportDTO {
  month?: string; // Formato YYYY-MM
}

export class ReportService {
  constructor(
    private readonly reportRepository: IReportRepository = defaultReportRepository,
    private readonly transactionsClient: ITransactionsClient = defaultTransactionsClient,
    private readonly budgetsClient: IBudgetsClient = defaultBudgetsClient
  ) {}

  /**
   * Genera el reporte mensual de gastos bajo demanda para el mes indicado o el mes actual.
   * Agrega información de transactions-service y budgets-service, guarda el resultado en disco
   * y registra sus metadatos.
   */
  async generateMonthlyReport(dto?: GenerateReportDTO): Promise<{ report: ReportContent; metadata: ReportMetadata }> {
    const targetMonth = dto?.month || this.getCurrentMonthString();
    const { startDate, endDate } = this.getMonthRange(targetMonth);

    logger.info(`Iniciando generación de reporte mensual para el periodo: ${targetMonth}`, {
      targetMonth,
      startDate,
      endDate
    });

    // Consultar ambos microservicios concurrentemente
    const [transactions, budgets] = await Promise.all([
      this.transactionsClient.getTransactions({ startDate, endDate }),
      this.budgetsClient.getBudgets({ period: 'monthly' })
    ]);

    // Mapear gastos acumulados por categoría
    const spentByCategory = new Map<string, number>();
    let totalSpent = 0;

    for (const tx of transactions) {
      const cat = tx.category.toLowerCase().trim();
      const current = spentByCategory.get(cat) || 0;
      spentByCategory.set(cat, current + tx.amount);
      totalSpent += tx.amount;
    }

    // Mapear presupuestos por categoría
    const budgetByCategory = new Map<string, number>();
    let totalBudget = 0;

    for (const b of budgets) {
      const cat = b.category.toLowerCase().trim();
      budgetByCategory.set(cat, b.limitAmount);
      totalBudget += b.limitAmount;
    }

    // Unir todas las categorías encontradas
    const allCategories = new Set<string>([
      ...spentByCategory.keys(),
      ...budgetByCategory.keys()
    ]);

    const categoryBreakdown: CategorySummary[] = [];

    for (const cat of Array.from(allCategories).sort()) {
      const spent = spentByCategory.get(cat) || 0;
      const budgetLimit = budgetByCategory.has(cat) ? budgetByCategory.get(cat)! : null;
      const difference = budgetLimit !== null ? budgetLimit - spent : -spent;
      const percentageUsed = budgetLimit && budgetLimit > 0
        ? Number(((spent / budgetLimit) * 100).toFixed(2))
        : null;

      let status: 'WITHIN_BUDGET' | 'EXCEEDED' | 'NO_BUDGET' = 'WITHIN_BUDGET';
      let isExceeded = false;
      if (budgetLimit === null) {
        status = 'NO_BUDGET';
      } else if (spent > budgetLimit) {
        status = 'EXCEEDED';
        isExceeded = true;
      }

      categoryBreakdown.push({
        category: cat,
        totalSpent: spent,
        budgetLimit,
        difference,
        percentageUsed,
        status,
        isExceeded
      });
    }

    const exceededCategories = categoryBreakdown
      .filter((c) => c.status === 'EXCEEDED')
      .map((c) => c.category);
    const hasExceededBudget = exceededCategories.length > 0;

    const alerts: string[] = [];
    if (hasExceededBudget) {
      for (const cat of exceededCategories) {
        const item = categoryBreakdown.find((c) => c.category === cat)!;
        const overspent = item.totalSpent - (item.budgetLimit || 0);
        alerts.push(
          `¡Alerta de sobregasto! La categoría "${cat}" superó su presupuesto de $${item.budgetLimit?.toFixed(2)} con un gasto de $${item.totalSpent.toFixed(2)} (exceso de $${overspent.toFixed(2)}, ${item.percentageUsed}% utilizado).`
        );
      }
    }

    const netSavings = totalBudget - totalSpent;
    const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const nowIso = new Date().toISOString();

    const reportContent: ReportContent = {
      id: reportId,
      month: targetMonth,
      startDate,
      endDate,
      generatedAt: nowIso,
      totalSpent,
      totalBudget,
      netSavings,
      transactionsCount: transactions.length,
      hasExceededBudget,
      exceededCategories,
      alerts,
      categoryBreakdown,
      transactions: transactions.map(t => ({
        id: t.id,
        amount: t.amount,
        category: t.category,
        date: t.date,
        description: t.description
      }))
    };

    // Guardar archivo físico en almacenamiento y registrar metadatos
    const metadata = await this.reportRepository.save(reportContent);

    logger.info('Reporte mensual generado y guardado exitosamente', {
      reportId: metadata.id,
      month: metadata.month,
      fileName: metadata.fileName,
      totalSpent,
      totalBudget
    });

    return { report: reportContent, metadata };
  }

  /**
   * Obtiene la lista de metadatos de todos los reportes generados.
   */
  async listReports(): Promise<ReportMetadata[]> {
    return this.reportRepository.findAll();
  }

  /**
   * Obtiene el contenido completo de un reporte por su ID.
   */
  async getReportById(id: string): Promise<ReportContent> {
    const report = await this.reportRepository.findFullReportById(id);
    if (!report) {
      throw new ReportError(`Reporte con ID ${id} no encontrado`, 404, 'NOT_FOUND');
    }
    return report;
  }

  /**
   * Obtiene la ruta física del archivo generado para descarga.
   */
  async getReportFilePath(id: string): Promise<string> {
    const filePath = await this.reportRepository.getFilePath(id);
    if (!filePath) {
      throw new ReportError(`Archivo del reporte con ID ${id} no encontrado`, 404, 'FILE_NOT_FOUND');
    }
    return filePath;
  }

  /**
   * Retorna el string del mes actual en formato YYYY-MM
   */
  private getCurrentMonthString(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Calcula el rango ISO 8601 completo (inicio y fin) para un mes YYYY-MM
   */
  private getMonthRange(monthStr: string): { startDate: string; endDate: string } {
    const [yearStr, monthPart] = monthStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthPart, 10); // 1-12

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      throw new ReportError('Formato de mes inválido. Debe ser YYYY-MM (ej: 2026-09)', 400, 'INVALID_MONTH');
    }

    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    // El día 0 del mes siguiente es el último día del mes actual
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString()
    };
  }
}

export const reportService = new ReportService();
