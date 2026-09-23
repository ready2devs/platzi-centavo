# Reports Service - Centavo 🪙📑

Microservicio encargado de la agregación de métricas financieras, consolidación de balances periódicos y generación de reportes mensuales de gastos para la plataforma Centavo, combinando información de `transactions-service` y `budgets-service`.

---

## 📋 Directivas (`AGENTS.MD`)

1. **Agregación consistente**: Los reportes mensuales deben consultar y consolidar de forma confiable las transacciones del periodo y los presupuestos vigentes.
2. **Sin datos sensibles**: Nunca almacenes ni registres en logs credenciales, tokens o passwords de usuarios.
3. **Persistencia física accesible**: Todo reporte generado debe persistirse en el sistema de archivos (`storage/reports`) y registrarse en el repositorio para su posterior consulta y descarga.
4. **Clientes desacoplados**: La comunicación con `transactions-service` y `budgets-service` debe realizarse a través de clientes con interfaces testeables y manejo de timeouts.
5. **Validación primero**: Todos los parámetros de entrada se validan mediante esquemas Zod antes de la ejecución de la lógica de negocio.

---

## 🛠️ Endpoints de la API

| Método | Endpoint | Descripción | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/reports/monthly` | Genera el reporte del mes actual (o el especificado) bajo demanda y guarda el archivo | No |
| `GET` | `/api/reports` | Lista todos los reportes generados | No |
| `GET` | `/api/reports/:id` | Obtiene el detalle completo y datos consolidados de un reporte | No |
| `GET` | `/api/reports/:id/download` | Descarga el archivo generado del reporte | No |
| `GET` | `/health` | Healthcheck del microservicio | No |

---

### POST /api/reports/monthly

Genera el reporte de gastos y balance del mes actual bajo demanda (o del mes indicado en formato `YYYY-MM`).

**Body opcional (JSON)**:
```json
{
  "month": "2026-09"
}
```
*(Si se envía vacío o se omite, se calcula automáticamente el mes actual).*

**Respuesta exitosa (201)**:
```json
{
  "message": "Reporte mensual generado y guardado exitosamente",
  "data": {
    "id": "rep_1727055000000_abc123",
    "month": "2026-09",
    "fileName": "report_2026-09_rep_1727055000000_abc123.json",
    "totalSpent": 1500.50,
    "totalBudget": 5000.00,
    "netSavings": 3499.50,
    "transactionsCount": 3,
    "downloadUrl": "/api/reports/rep_1727055000000_abc123/download",
    "report": {
      "id": "rep_1727055000000_abc123",
      "month": "2026-09",
      "startDate": "2026-09-01T00:00:00.000Z",
      "endDate": "2026-09-30T23:59:59.999Z",
      "generatedAt": "2026-09-22T22:45:00.000Z",
      "totalSpent": 1500.50,
      "totalBudget": 5000.00,
      "netSavings": 3499.50,
      "transactionsCount": 3,
      "categoryBreakdown": [
        {
          "category": "food",
          "totalSpent": 1500.50,
          "budgetLimit": 5000.00,
          "difference": 3499.50,
          "percentageUsed": 30.01,
          "status": "WITHIN_BUDGET"
        }
      ],
      "transactions": [ /* detalle de transacciones incluidas */ ]
    }
  }
}
```

---

### GET /api/reports

Lista el historial de reportes generados.

**Respuesta (200)**:
```json
{
  "data": [
    {
      "id": "rep_1727055000000_abc123",
      "month": "2026-09",
      "generatedAt": "2026-09-22T22:45:00.000Z",
      "totalSpent": 1500.50,
      "totalBudget": 5000.00,
      "netSavings": 3499.50,
      "transactionsCount": 3,
      "fileName": "report_2026-09_rep_1727055000000_abc123.json",
      "filePath": "storage/reports/report_2026-09_rep_1727055000000_abc123.json"
    }
  ],
  "total": 1
}
```

---

### GET /api/reports/:id/download

Descarga el archivo físico guardado del reporte (formato `.json` con headers de descarga de archivo).

---

## ⚙️ Variables de Entorno

| Variable | Descripción | Valor por defecto |
| :--- | :--- | :--- |
| `PORT` | Puerto de escucha del servicio HTTP | `3005` |
| `NODE_ENV` | Entorno de ejecución (`development`, `production`, `test`) | `development` |
| `CORS_ORIGIN` | Origen permitido para solicitudes CORS | `*` |
| `TRANSACTIONS_SERVICE_URL` | URL base del microservicio `transactions-service` | `http://localhost:3002` |
| `BUDGETS_SERVICE_URL` | URL base del microservicio `budgets-service` | `http://localhost:3003` |
| `STORAGE_DIR` | Directorio donde se guardan los archivos de reportes | `./storage/reports` |

---

## 🚀 Comandos Disponibles

```bash
# Instalar dependencias
npm install

# Generar reporte mensual bajo demanda (modo CLI recomendado)
npm run report
# O especificando un mes específico:
npm run report -- 2026-09

# Levantar servidor API HTTP en modo desarrollo (opcional)
npm run serve
# (o npm run dev)

# Ejecutar batería de tests automatizados
npm test

# Compilar TypeScript para producción
npm run build

# Iniciar servidor en producción
npm start
```

