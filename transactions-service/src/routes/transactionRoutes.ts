import { Router } from 'express';
import { transactionController } from '../controllers/transactionController.js';

export const transactionRouter = Router();

// POST /api/transactions — Crear una transacción
transactionRouter.post('/', (req, res) => transactionController.create(req, res));

// GET /api/transactions — Listar transacciones (con filtros opcionales)
transactionRouter.get('/', (req, res) => transactionController.list(req, res));
