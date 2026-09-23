import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import { createApp } from '../src/app.js';
import { defaultReportRepository } from '../src/repositories/reportRepository.js';

const app = createApp();

const MOCK_TRANSACTIONS = [
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

const MOCK_BUDGETS = [
  {
    id: 'bgt_1',
    category: 'food',
    limitAmount: 2500,
    period: 'monthly'
  },
  {
    id: 'bgt_2',
    category: 'transport',
    limitAmount: 400,
    period: 'monthly'
  }
];

describe('Reports Service', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await defaultReportRepository.clear();

    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const urlStr = input.toString();

      if (urlStr.includes('/api/transactions')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: MOCK_TRANSACTIONS, total: MOCK_TRANSACTIONS.length })
        } as Response;
      }

      if (urlStr.includes('/api/budgets')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: MOCK_BUDGETS, total: MOCK_BUDGETS.length })
        } as Response;
      }

      return {
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not found' })
      } as Response;
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  // ─────────────────────────────────────────────
  // Health Check
  // ─────────────────────────────────────────────
  describe('GET /health', () => {
    it('debe responder 200 con estado ok del servicio', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('reports-service');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────
  // POST /api/reports/monthly
  // ─────────────────────────────────────────────
  describe('POST /api/reports/monthly', () => {
    it('debe generar el reporte mensual agregando transacciones y presupuestos y guardarlo en archivo', async () => {
      const res = await request(app)
        .post('/api/reports/monthly')
        .send({ month: '2026-09' });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Reporte mensual generado y guardado exitosamente');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toMatch(/^rep_/);
      expect(res.body.data.month).toBe('2026-09');
      expect(res.body.data.downloadUrl).toBe(`/api/reports/${res.body.data.id}/download`);

      // Verificación de totales consolidados
      // food: 1200 + 800 = 2000 (presupuesto 2500 -> WITHIN_BUDGET)
      // transport: 500 (presupuesto 400 -> EXCEEDED)
      // entertainment: 300 (sin presupuesto -> NO_BUDGET)
      // totalSpent: 2000 + 500 + 300 = 2800
      // totalBudget: 2500 + 400 = 2900
      // netSavings: 2900 - 2800 = 100
      expect(res.body.data.totalSpent).toBe(2800);
      expect(res.body.data.totalBudget).toBe(2900);
      expect(res.body.data.netSavings).toBe(100);
      expect(res.body.data.transactionsCount).toBe(4);

      // Verificación de desglose por categoría
      const breakdown = res.body.data.report.categoryBreakdown;
      expect(breakdown).toHaveLength(3);

      const foodCategory = breakdown.find((b: { category: string }) => b.category === 'food');
      expect(foodCategory).toMatchObject({
        category: 'food',
        totalSpent: 2000,
        budgetLimit: 2500,
        difference: 500,
        percentageUsed: 80,
        status: 'WITHIN_BUDGET'
      });

      const transportCategory = breakdown.find((b: { category: string }) => b.category === 'transport');
      expect(transportCategory).toMatchObject({
        category: 'transport',
        totalSpent: 500,
        budgetLimit: 400,
        difference: -100,
        percentageUsed: 125,
        status: 'EXCEEDED'
      });

      const entertainmentCategory = breakdown.find((b: { category: string }) => b.category === 'entertainment');
      expect(entertainmentCategory).toMatchObject({
        category: 'entertainment',
        totalSpent: 300,
        budgetLimit: null,
        difference: -300,
        percentageUsed: null,
        status: 'NO_BUDGET'
      });

      // Verificar que el archivo físico realmente se creó en disco
      const filePath = path.resolve(process.cwd(), 'storage/reports', res.body.data.fileName);
      expect(fs.existsSync(filePath)).toBe(true);

      const savedContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(savedContent.id).toBe(res.body.data.id);
      expect(savedContent.totalSpent).toBe(2800);
    });

    it('debe generar el reporte para el mes actual por defecto si no se pasa body', async () => {
      const res = await request(app)
        .post('/api/reports/monthly')
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.month).toMatch(/^\d{4}-\d{2}$/);
    });

    it('debe rechazar con 400 si el formato de mes no es YYYY-MM', async () => {
      const res = await request(app)
        .post('/api/reports/monthly')
        .send({ month: '2026-13' }); // Mes 13 inválido

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ─────────────────────────────────────────────
  // GET /api/reports y GET /api/reports/:id
  // ─────────────────────────────────────────────
  describe('GET /api/reports y GET /api/reports/:id', () => {
    it('debe listar los reportes generados y obtener uno por su ID', async () => {
      // 1. Generar un reporte primero
      const createRes = await request(app)
        .post('/api/reports/monthly')
        .send({ month: '2026-09' });

      const reportId = createRes.body.data.id;

      // 2. Listar reportes
      const listRes = await request(app).get('/api/reports');
      expect(listRes.status).toBe(200);
      expect(listRes.body.total).toBe(1);
      expect(listRes.body.data[0].id).toBe(reportId);

      // 3. Consultar por ID
      const getRes = await request(app).get(`/api/reports/${reportId}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.id).toBe(reportId);
      expect(getRes.body.data.categoryBreakdown).toBeDefined();
    });

    it('debe devolver 404 para un reporte que no existe', async () => {
      const res = await request(app).get('/api/reports/rep_inexistente');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // ─────────────────────────────────────────────
  // GET /api/reports/:id/download
  // ─────────────────────────────────────────────
  describe('GET /api/reports/:id/download', () => {
    it('debe permitir descargar el archivo generado del reporte', async () => {
      const createRes = await request(app)
        .post('/api/reports/monthly')
        .send({ month: '2026-09' });

      const reportId = createRes.body.data.id;

      const downloadRes = await request(app).get(`/api/reports/${reportId}/download`);
      expect(downloadRes.status).toBe(200);
      expect(downloadRes.headers['content-disposition']).toContain('attachment');
      expect(downloadRes.body.id).toBe(reportId);
      expect(downloadRes.body.month).toBe('2026-09');
    });

    it('debe devolver 404 si el reporte a descargar no existe', async () => {
      const res = await request(app).get('/api/reports/rep_inexistente/download');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('FILE_NOT_FOUND');
    });
  });

  // ─────────────────────────────────────────────
  // 404 Handler
  // ─────────────────────────────────────────────
  describe('Rutas desconocidas', () => {
    it('debe retornar 404 para endpoints inexistentes', async () => {
      const res = await request(app).get('/ruta-que-no-existe');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
