import { Request, Response } from 'express';
import { z } from 'zod';
import { reportService, ReportError } from '../services/reportService.js';
import { logger } from '../utils/logger.js';

const generateReportSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, {
      message: 'El mes debe estar en formato YYYY-MM (ej: 2026-09)'
    })
    .optional()
}).optional();

export class ReportController {
  /**
   * POST /api/reports/monthly
   * Genera el reporte del mes actual (o el especificado en `month`) bajo demanda.
   * Guarda el resultado como archivo en disco y registra los metadatos.
   */
  async generateMonthly(req: Request, res: Response): Promise<void> {
    try {
      const parseResult = generateReportSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Parámetros de entrada inválidos',
            details: parseResult.error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message
            }))
          }
        });
        return;
      }

      const result = await reportService.generateMonthlyReport(parseResult.data);

      res.status(201).json({
        message: 'Reporte mensual generado y guardado exitosamente',
        data: {
          id: result.metadata.id,
          month: result.metadata.month,
          fileName: result.metadata.fileName,
          totalSpent: result.metadata.totalSpent,
          totalBudget: result.metadata.totalBudget,
          netSavings: result.metadata.netSavings,
          transactionsCount: result.metadata.transactionsCount,
          hasExceededBudget: result.report.hasExceededBudget,
          exceededCategories: result.report.exceededCategories,
          alerts: result.report.alerts,
          downloadUrl: `/api/reports/${result.metadata.id}/download`,
          report: result.report
        }
      });
    } catch (error: unknown) {
      if (error instanceof ReportError) {
        res.status(error.statusCode).json({
          error: {
            code: error.code,
            message: error.message
          }
        });
        return;
      }

      logger.error('Error al generar reporte mensual', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error interno al generar el reporte'
        }
      });
    }
  }

  /**
   * GET /api/reports
   * Lista todos los reportes generados.
   */
  async list(_req: Request, res: Response): Promise<void> {
    try {
      const reports = await reportService.listReports();
      res.status(200).json({
        data: reports,
        total: reports.length
      });
    } catch (error: unknown) {
      logger.error('Error al listar reportes', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error interno al obtener los reportes'
        }
      });
    }
  }

  /**
   * GET /api/reports/:id
   * Obtiene los detalles completos de un reporte generado.
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const report = await reportService.getReportById(id);
      res.status(200).json({
        data: report
      });
    } catch (error: unknown) {
      if (error instanceof ReportError) {
        res.status(error.statusCode).json({
          error: {
            code: error.code,
            message: error.message
          }
        });
        return;
      }

      logger.error(`Error al obtener reporte ${req.params.id}`, error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error interno al obtener el reporte'
        }
      });
    }
  }

  /**
   * GET /api/reports/:id/download
   * Descarga el archivo físico del reporte generado.
   */
  async download(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const filePath = await reportService.getReportFilePath(id);
      res.download(filePath);
    } catch (error: unknown) {
      if (error instanceof ReportError) {
        res.status(error.statusCode).json({
          error: {
            code: error.code,
            message: error.message
          }
        });
        return;
      }

      logger.error(`Error al descargar archivo del reporte ${req.params.id}`, error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error interno al descargar el archivo del reporte'
        }
      });
    }
  }
}

export const reportController = new ReportController();
