import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { defaultNotificationRepository } from '../src/repositories/notificationRepository.js';
import { NotificationService } from '../src/services/notificationService.js';
import { IBudgetProvider } from '../src/services/budgetProvider.js';

const app = createApp();

describe('Notifications Service', () => {
  beforeEach(async () => {
    await defaultNotificationRepository.clear();
  });

  // ─────────────────────────────────────────────
  // POST /api/notifications/events/transaction
  // ─────────────────────────────────────────────
  describe('POST /api/notifications/events/transaction', () => {
    it('debe generar alerta de sobregasto (201) cuando el gasto total supera el límite presupuestario', async () => {
      const payload = {
        transactionId: 'txn_123456',
        amount: 1500,
        category: 'food',
        date: '2026-09-22T10:00:00.000Z',
        description: 'Almuerzo gourmet',
        currentSpent: 4000,
        budgetLimit: 5000
      };

      const res = await request(app)
        .post('/api/notifications/events/transaction')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.alertGenerated).toBe(true);
      expect(res.body.message).toBe('Alerta de sobregasto generada');
      expect(res.body.data).toMatchObject({
        type: 'OVERSPENT_ALERT',
        category: 'food',
        transactionId: 'txn_123456',
        amount: 1500,
        budgetLimit: 5000,
        currentSpent: 5500,
        overspentAmount: 500,
        percentage: 110,
        read: false
      });
      expect(res.body.data.id).toMatch(/^notif_/);
      expect(res.body.data.message).toContain('Has superado tu presupuesto');
    });

    it('debe generar alerta cuando se alcanza exactamente el 100% del presupuesto', async () => {
      const payload = {
        transactionId: 'txn_exact_limit',
        amount: 1000,
        category: 'entertainment',
        date: '2026-09-22T12:00:00.000Z',
        currentSpent: 4000,
        budgetLimit: 5000
      };

      const res = await request(app)
        .post('/api/notifications/events/transaction')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.alertGenerated).toBe(true);
      expect(res.body.data.percentage).toBe(100);
      expect(res.body.data.overspentAmount).toBe(0);
      expect(res.body.data.message).toContain('Has alcanzado el 100% de tu presupuesto');
    });

    it('no debe generar alerta (200) cuando la transacción queda dentro del presupuesto', async () => {
      const payload = {
        transactionId: 'txn_safe',
        amount: 300,
        category: 'food',
        date: '2026-09-22T10:30:00.000Z',
        currentSpent: 2000,
        budgetLimit: 5000
      };

      const res = await request(app)
        .post('/api/notifications/events/transaction')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.alertGenerated).toBe(false);
      expect(res.body.data).toBeNull();
      expect(res.body.reason).toBe('WITHIN_BUDGET');
    });

    it('no debe generar alerta (200) cuando la categoría no tiene presupuesto definido', async () => {
      const payload = {
        transactionId: 'txn_no_budget',
        amount: 500,
        category: 'uncategorized_other',
        date: '2026-09-22T11:00:00.000Z'
      };

      const res = await request(app)
        .post('/api/notifications/events/transaction')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.alertGenerated).toBe(false);
      expect(res.body.data).toBeNull();
      expect(res.body.reason).toBe('NO_BUDGET_FOUND');
    });

    it('debe rechazar con 400 si falta el transactionId', async () => {
      const res = await request(app)
        .post('/api/notifications/events/transaction')
        .send({
          amount: 500,
          category: 'food',
          date: '2026-09-22T10:00:00.000Z'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d: { field: string }) => d.field === 'transactionId')).toBe(true);
    });

    it('debe rechazar con 400 si el monto es menor o igual a cero', async () => {
      const res = await request(app)
        .post('/api/notifications/events/transaction')
        .send({
          transactionId: 'txn_invalid',
          amount: -50,
          category: 'food',
          date: '2026-09-22T10:00:00.000Z'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d: { field: string }) => d.field === 'amount')).toBe(true);
    });

    it('debe rechazar con 400 si la categoría está vacía', async () => {
      const res = await request(app)
        .post('/api/notifications/events/transaction')
        .send({
          transactionId: 'txn_invalid_cat',
          amount: 100,
          category: '   ',
          date: '2026-09-22T10:00:00.000Z'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d: { field: string }) => d.field === 'category')).toBe(true);
    });

    it('debe rechazar con 400 si el currentSpent es negativo', async () => {
      const res = await request(app)
        .post('/api/notifications/events/transaction')
        .send({
          transactionId: 'txn_invalid_spent',
          amount: 100,
          category: 'food',
          date: '2026-09-22T10:00:00.000Z',
          currentSpent: -10
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d: { field: string }) => d.field === 'currentSpent')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────
  // GET /api/notifications
  // ─────────────────────────────────────────────
  describe('GET /api/notifications', () => {
    beforeEach(async () => {
      // Generar dos alertas para pruebas de listado
      await request(app).post('/api/notifications/events/transaction').send({
        transactionId: 'txn_seed_1',
        amount: 2000,
        category: 'food',
        date: '2026-09-22T08:00:00.000Z',
        currentSpent: 4000,
        budgetLimit: 5000
      });

      await request(app).post('/api/notifications/events/transaction').send({
        transactionId: 'txn_seed_2',
        amount: 1000,
        category: 'transport',
        date: '2026-09-22T09:00:00.000Z',
        currentSpent: 1200,
        budgetLimit: 1500
      });
    });

    it('debe listar todas las notificaciones registradas', async () => {
      const res = await request(app).get('/api/notifications');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it('debe filtrar alertas por categoría (case-insensitive)', async () => {
      const res = await request(app).get('/api/notifications?category=FOOD');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].category).toBe('food');
    });

    it('debe filtrar alertas por estado de lectura', async () => {
      const listRes = await request(app).get('/api/notifications');
      const firstId = listRes.body.data[0].id;

      // Marcar una como leída
      await request(app).patch(`/api/notifications/${firstId}/read`);

      const resUnread = await request(app).get('/api/notifications?read=false');
      expect(resUnread.status).toBe(200);
      expect(resUnread.body.data).toHaveLength(1);

      const resRead = await request(app).get('/api/notifications?read=true');
      expect(resRead.status).toBe(200);
      expect(resRead.body.data).toHaveLength(1);
      expect(resRead.body.data[0].id).toBe(firstId);
    });
  });

  // ─────────────────────────────────────────────
  // GET /api/notifications/:id & PATCH
  // ─────────────────────────────────────────────
  describe('GET & PATCH /api/notifications/:id', () => {
    it('debe obtener una notificación existente por ID', async () => {
      const created = await request(app).post('/api/notifications/events/transaction').send({
        transactionId: 'txn_single',
        amount: 2500,
        category: 'entertainment',
        date: '2026-09-22T09:00:00.000Z',
        currentSpent: 3000,
        budgetLimit: 4000
      });

      const notifId = created.body.data.id;
      const res = await request(app).get(`/api/notifications/${notifId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(notifId);
      expect(res.body.data.category).toBe('entertainment');
    });

    it('debe retornar 404 si la notificación no existe', async () => {
      const res = await request(app).get('/api/notifications/notif_inexistente');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('debe permitir marcar una notificación como leída', async () => {
      const created = await request(app).post('/api/notifications/events/transaction').send({
        transactionId: 'txn_read_test',
        amount: 1500,
        category: 'food',
        date: '2026-09-22T09:00:00.000Z',
        currentSpent: 4000,
        budgetLimit: 5000
      });

      const notifId = created.body.data.id;
      const res = await request(app).patch(`/api/notifications/${notifId}/read`);

      expect(res.status).toBe(200);
      expect(res.body.data.read).toBe(true);
      expect(res.body.message).toBe('Notificación marcada como leída');
    });
  });

  // ─────────────────────────────────────────────
  // Unit tests con Mock BudgetProvider
  // ─────────────────────────────────────────────
  describe('NotificationService con MockBudgetProvider', () => {
    it('debe consultar y aplicar el límite del proveedor si no se envía en el DTO', async () => {
      const mockBudgetProvider: IBudgetProvider = {
        getBudgetByCategory: async (category: string) => {
          if (category === 'groceries') {
            return { category: 'groceries', limitAmount: 3000, period: 'monthly' };
          }
          return null;
        }
      };

      const customService = new NotificationService(defaultNotificationRepository, mockBudgetProvider);

      const result = await customService.processTransactionEvent({
        transactionId: 'txn_mock_1',
        amount: 3500,
        category: 'groceries',
        date: '2026-09-22T10:00:00.000Z'
      });

      expect(result.alertGenerated).toBe(true);
      expect(result.notification?.budgetLimit).toBe(3000);
      expect(result.notification?.amount).toBe(3500);
      expect(result.notification?.currentSpent).toBe(3500);
      expect(result.notification?.overspentAmount).toBe(500);
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
      expect(res.body.service).toBe('notifications-service');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────
  // 404
  // ─────────────────────────────────────────────
  describe('Rutas inexistentes', () => {
    it('debe devolver 404 en rutas desconocidas', async () => {
      const res = await request(app).get('/api/ruta-desconocida');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
