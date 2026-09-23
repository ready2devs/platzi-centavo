import { Router } from 'express';
import { reportController } from '../controllers/reportController.js';

export const reportRouter = Router();

// POST /api/reports/monthly — Generar reporte del mes actual (o especificado)
reportRouter.post('/monthly', (req, res) => reportController.generateMonthly(req, res));

// GET /api/reports — Listar todos los reportes generados
reportRouter.get('/', (req, res) => reportController.list(req, res));

// GET /api/reports/:id/download — Descargar el archivo físico del reporte
reportRouter.get('/:id/download', (req, res) => reportController.download(req, res));

// GET /api/reports/:id — Obtener detalle completo de un reporte
reportRouter.get('/:id', (req, res) => reportController.getById(req, res));
