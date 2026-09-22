import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { defaultBudgetRepository } from '../src/repositories/budgetRepository.js';

const app = createApp();

const VALID_BUDGET = {
  category: 'food',
  limitAmount: 5000,
  period: 'monthly',
  description: 'Presupuesto para supermercado y restaurantes'
};

describe('Budgets Service', () => {
  beforeEach(async () => {
    await defaultBudgetRepository.clear();
  });

  // ─────────────────────────────────────────────
  // POST /api/budgets
  // ─────────────────────────────────────────────
  describe('POST /api/budgets', () => {
    it('debe crear un presupuesto exitosamente y devolver 201 con los datos', async () => {
      const res = await request(app)
        .post('/api/budgets')
        .send(VALID_BUDGET);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Presupuesto registrado exitosamente');
      expect(res.body.data).toMatchObject({
        category: 'food',
        limitAmount: 5000,
        period: 'monthly',
        description: 'Presupuesto para supermercado y restaurantes'
      });
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.id).toMatch(/^bgt_/);
      expect(res.body.data.createdAt).toBeDefined();
      expect(res.body.data.updatedAt).toBeDefined();
    });

    it('debe crear un presupuesto sin descripción (campo opcional)', async () => {
      const res = await request(app)
        .post('/api/budgets')
        .send({ category: 'transport', limitAmount: 1200, period: 'monthly' });

      expect(res.status).toBe(201);
      expect(res.body.data.description).toBeUndefined();
    });

    it('debe rechazar con 400 si el limitAmount está ausente', async () => {
      const res = await request(app)
        .post('/api/budgets')
        .send({ category: 'food', period: 'monthly' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d: { field: string }) => d.field === 'limitAmount')).toBe(true);
    });

    it('debe rechazar con 400 si el limitAmount es negativo', async () => {
      const res = await request(app)
        .post('/api/budgets')
        .send({ category: 'food', limitAmount: -100, period: 'monthly' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('debe rechazar con 400 si el limitAmount es cero', async () => {
      const res = await request(app)
        .post('/api/budgets')
        .send({ category: 'food', limitAmount: 0, period: 'monthly' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('debe rechazar con 400 si la categoría está vacía', async () => {
      const res = await request(app)
        .post('/api/budgets')
        .send({ category: '   ', limitAmount: 1000, period: 'monthly' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d: { field: string }) => d.field === 'category')).toBe(true);
    });

    it('debe rechazar con 400 si el periodo está ausente o vacío', async () => {
      const res = await request(app)
        .post('/api/budgets')
        .send({ category: 'food', limitAmount: 1000, period: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d: { field: string }) => d.field === 'period')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────
  // GET /api/budgets
  // ─────────────────────────────────────────────
  describe('GET /api/budgets', () => {
    beforeEach(async () => {
      // Seed de presupuestos para pruebas de listado
      await request(app).post('/api/budgets').send({ category: 'food', limitAmount: 3000, period: 'monthly' });
      await request(app).post('/api/budgets').send({ category: 'transport', limitAmount: 800, period: 'monthly' });
      await request(app).post('/api/budgets').send({ category: 'food', limitAmount: 700, period: 'weekly' });
      await request(app).post('/api/budgets').send({ category: 'entertainment', limitAmount: 1500, period: 'yearly' });
    });

    it('debe listar todos los presupuestos sin filtros', async () => {
      const res = await request(app).get('/api/budgets');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(4);
      expect(res.body.total).toBe(4);
    });

    it('debe devolver un array vacío si no hay presupuestos registrados', async () => {
      await defaultBudgetRepository.clear();
      const res = await request(app).get('/api/budgets');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.total).toBe(0);
    });

    it('debe filtrar por categoría (case-insensitive)', async () => {
      const res = await request(app).get('/api/budgets?category=FOOD');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.every((b: { category: string }) => b.category.toLowerCase() === 'food')).toBe(true);
    });

    it('debe filtrar por periodo (case-insensitive)', async () => {
      const res = await request(app).get('/api/budgets?period=MONTHLY');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.every((b: { period: string }) => b.period === 'monthly')).toBe(true);
    });

    it('debe filtrar por categoría y periodo combinados', async () => {
      const res = await request(app).get('/api/budgets?category=food&period=weekly');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].category).toBe('food');
      expect(res.body.data[0].period).toBe('weekly');
      expect(res.body.data[0].limitAmount).toBe(700);
    });

    it('debe devolver vacío para una categoría inexistente', async () => {
      const res = await request(app).get('/api/budgets?category=nonexistent');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.total).toBe(0);
    });
  });

  // ─────────────────────────────────────────────
  // GET /health
  // ─────────────────────────────────────────────
  describe('GET /health', () => {
    it('debe devolver status ok con el nombre del servicio', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('budgets-service');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────
  // 404
  // ─────────────────────────────────────────────
  describe('Ruta inexistente', () => {
    it('debe devolver 404 para rutas no definidas', async () => {
      const res = await request(app).get('/api/inexistente');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
