import { Router } from 'express';
import { budgetController } from '../controllers/budgetController.js';

export const budgetRouter = Router();

// POST /api/budgets — Crear un presupuesto
budgetRouter.post('/', (req, res) => budgetController.create(req, res));

// GET /api/budgets — Listar presupuestos (con filtros opcionales)
budgetRouter.get('/', (req, res) => budgetController.list(req, res));
