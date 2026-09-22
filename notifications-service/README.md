# Notifications Service - Centavo 🪙🔔

Microservicio encargado del monitoreo y emisión de alertas tempranas y de sobregasto para la plataforma Centavo. Evalúa eventos de nuevas transacciones contra los presupuestos asignados por categoría y genera notificaciones pertinentes.

---

## 📋 Directivas (`AGENTS.MD`)

1. **Detección de sobregasto**: Si el gasto acumulado tras una transacción alcanza o supera el límite presupuestario asignado para esa categoría (`totalSpent >= budgetLimit`), debe emitirse y registrarse una alerta de tipo `OVERSPENT_ALERT`.
2. **Validación obligatoria**: Toda carga útil de eventos de transacciones y parámetros de consulta se valida estrictamente mediante esquemas Zod antes de acceder a la capa de servicios.
3. **Repositorio in-memory temporal**: El almacenamiento se implementa en memoria con `InMemoryNotificationRepository`. Toda migración a almacenamiento persistente requiere justificación en el plan.
4. **Seguridad en observabilidad**: Ningún log debe registrar credenciales, tokens ni datos sensibles (`logger.ts` sanitiza automáticamente las entradas).

---

## 🛠️ Endpoints de la API

| Método | Endpoint | Descripción | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/notifications/events/transaction` | Recibe un evento de transacción y evalúa si genera alerta de sobregasto | No |
| `GET` | `/api/notifications` | Lista el historial de alertas y notificaciones emitidas | No |
| `GET` | `/api/notifications/:id` | Consulta los detalles de una alerta específica por su ID | No |
| `GET` | `/health` | Healthcheck del microservicio | No |

### POST /api/notifications/events/transaction

**Body (JSON)**:
```json
{
  "transactionId": "txn_1718448000000_abc123",
  "amount": 1500.00,
  "category": "food",
  "date": "2024-06-15T12:00:00.000Z",
  "description": "Cena en restaurante",
  "currentSpent": 4000.00,
  "budgetLimit": 5000.00
}
```

| Campo | Tipo | Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| `transactionId` | `string` | ✅ | ID único de la transacción asociada |
| `amount` | `number` | ✅ | Monto de la transacción (> 0) |
| `category` | `string` | ✅ | Categoría del gasto (ej: `food`, `transport`) |
| `date` | `string` | ✅ | Fecha del evento (ISO 8601) |
| `description` | `string` | ❌ | Descripción opcional del gasto |
| `currentSpent` | `number` | ❌ | Gasto previo acumulado en la categoría (opcional si se resuelve vía servicio de presupuestos) |
| `budgetLimit` | `number` | ❌ | Monto límite del presupuesto (opcional si se resuelve vía servicio de presupuestos) |

**Respuesta cuando se genera alerta (201 Created)**:
```json
{
  "message": "Alerta de sobregasto generada",
  "alertGenerated": true,
  "data": {
    "id": "notif_1718448000000_xyz789",
    "type": "OVERSPENT_ALERT",
    "category": "food",
    "transactionId": "txn_1718448000000_abc123",
    "amount": 1500.00,
    "budgetLimit": 5000.00,
    "currentSpent": 5500.00,
    "overspentAmount": 500.00,
    "percentage": 110.0,
    "message": "¡Alerta de sobregasto en food! Has gastado $5500.00 de tu presupuesto de $5000.00 (110.0%).",
    "read": false,
    "createdAt": "2024-06-15T12:00:00.000Z",
    "updatedAt": "2024-06-15T12:00:00.000Z"
  }
}
```

**Respuesta cuando no hay sobregasto (200 OK)**:
```json
{
  "message": "Transacción evaluada, no requiere alerta de sobregasto",
  "alertGenerated": false,
  "data": null
}
```

---

## ⚙️ Variables de Entorno

| Variable | Descripción | Valor por defecto |
| :--- | :--- | :--- |
| `PORT` | Puerto de escucha HTTP | `3004` |
| `NODE_ENV` | Entorno de ejecución (`development`, `production`, `test`) | `development` |
| `CORS_ORIGIN` | Origen permitido para CORS | `http://localhost:3000` |
| `BUDGETS_SERVICE_URL` | URL base del microservicio de presupuestos | `http://localhost:3003` |

---

## 🚀 Comandos Disponibles

```bash
# Instalar dependencias
npm install

# Modo desarrollo con recarga en caliente
npm run dev

# Ejecutar tests automatizados
npm test

# Compilar TypeScript para producción
npm run build

# Iniciar en producción
npm start
```
