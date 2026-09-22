import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { defaultTransactionRepository } from '../src/repositories/transactionRepository.js';

const app = createApp();

const VALID_TRANSACTION = {
  amount: 1500.5,
  category: 'food',
  date: '2024-06-15T12:00:00.000Z',
  description: 'Almuerzo en restaurante'
};

describe('Transactions Service', () => {
  beforeEach(async () => {
    await defaultTransactionRepository.clear();
  });

  // ─────────────────────────────────────────────
  // POST /api/transactions
  // ─────────────────────────────────────────────
  describe('POST /api/transactions', () => {
    it('debe crear una transacción exitosamente y devolver 201 con los datos', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .send(VALID_TRANSACTION);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Transacción registrada exitosamente');
      expect(res.body.data).toMatchObject({
        amount: 1500.5,
        category: 'food',
        date: '2024-06-15T12:00:00.000Z',
        description: 'Almuerzo en restaurante'
      });
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.id).toMatch(/^txn_/);
      expect(res.body.data.createdAt).toBeDefined();
      expect(res.body.data.updatedAt).toBeDefined();
    });

    it('debe crear una transacción sin descripción (campo opcional)', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .send({ amount: 500, category: 'transport', date: '2024-06-15T08:00:00.000Z' });

      expect(res.status).toBe(201);
      expect(res.body.data.description).toBeUndefined();
    });

    it('debe rechazar con 400 si el amount está ausente', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .send({ category: 'food', date: '2024-06-15T12:00:00.000Z' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d: { field: string }) => d.field === 'amount')).toBe(true);
    });

    it('debe rechazar con 400 si el amount es negativo', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .send({ amount: -100, category: 'food', date: '2024-06-15T12:00:00.000Z' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('debe rechazar con 400 si el amount es cero', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .send({ amount: 0, category: 'food', date: '2024-06-15T12:00:00.000Z' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('debe rechazar con 400 si la categoría está vacía', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .send({ amount: 100, category: '', date: '2024-06-15T12:00:00.000Z' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d: { field: string }) => d.field === 'category')).toBe(true);
    });

    it('debe rechazar con 400 si la fecha no es ISO 8601 válida', async () => {
      const res = await request(app)
        .post('/api/transactions')
        .send({ amount: 100, category: 'food', date: '15/06/2024' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d: { field: string }) => d.field === 'date')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────
  // GET /api/transactions
  // ─────────────────────────────────────────────
  describe('GET /api/transactions', () => {
    beforeEach(async () => {
      // Seed de transacciones para pruebas de listado
      await request(app).post('/api/transactions').send({ amount: 200, category: 'food', date: '2024-06-10T10:00:00.000Z' });
      await request(app).post('/api/transactions').send({ amount: 500, category: 'transport', date: '2024-06-15T09:00:00.000Z' });
      await request(app).post('/api/transactions').send({ amount: 1200, category: 'food', date: '2024-06-20T14:00:00.000Z' });
      await request(app).post('/api/transactions').send({ amount: 350, category: 'entertainment', date: '2024-07-01T18:00:00.000Z' });
    });

    it('debe listar todas las transacciones sin filtros', async () => {
      const res = await request(app).get('/api/transactions');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(4);
      expect(res.body.total).toBe(4);
    });

    it('debe devolver un array vacío si no hay transacciones', async () => {
      await defaultTransactionRepository.clear();
      const res = await request(app).get('/api/transactions');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.total).toBe(0);
    });

    it('debe filtrar por categoría exacta', async () => {
      const res = await request(app).get('/api/transactions?category=food');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.every((t: { category: string }) => t.category === 'food')).toBe(true);
    });

    it('debe filtrar por categoría (case-insensitive)', async () => {
      const res = await request(app).get('/api/transactions?category=FOOD');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('debe devolver vacío para una categoría inexistente', async () => {
      const res = await request(app).get('/api/transactions?category=nonexistent');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('debe filtrar por startDate (inclusive)', async () => {
      const res = await request(app).get('/api/transactions?startDate=2024-06-15T00:00:00.000Z');

      expect(res.status).toBe(200);
      // transport (Jun 15), food (Jun 20), entertainment (Jul 1) = 3
      expect(res.body.data).toHaveLength(3);
    });

    it('debe filtrar por endDate (inclusive)', async () => {
      const res = await request(app).get('/api/transactions?endDate=2024-06-15T23:59:59.000Z');

      expect(res.status).toBe(200);
      // food (Jun 10), transport (Jun 15) = 2
      expect(res.body.data).toHaveLength(2);
    });

    it('debe filtrar por rango de fechas startDate + endDate', async () => {
      const res = await request(app).get(
        '/api/transactions?startDate=2024-06-14T00:00:00.000Z&endDate=2024-06-21T00:00:00.000Z'
      );

      expect(res.status).toBe(200);
      // transport (Jun 15), food (Jun 20) = 2
      expect(res.body.data).toHaveLength(2);
    });

    it('debe devolver los resultados ordenados por fecha descendente', async () => {
      const res = await request(app).get('/api/transactions');

      expect(res.status).toBe(200);
      const dates = res.body.data.map((t: { date: string }) => new Date(t.date).getTime());
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
      }
    });

    it('debe rechazar con 400 si startDate tiene formato inválido', async () => {
      const res = await request(app).get('/api/transactions?startDate=invalid-date');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
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
      expect(res.body.service).toBe('transactions-service');
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
