# Transactions Service - Centavo 🪙💸

Microservicio encargado del registro, almacenamiento y categorización de movimientos financieros (gastos) para la plataforma Centavo. Actúa como **fuente de verdad del historial transaccional**.

---

## 📋 Directivas (`AGENTS.MD`)

1. **Integridad de datos**: Los montos (`amount`) siempre deben ser números positivos. Ninguna transacción puede registrarse con monto cero o negativo.
2. **Sin datos sensibles**: No se almacena información de autenticación (passwords, tokens) en las transacciones.
3. **Repositorio in-memory temporal**: El almacenamiento actual es en memoria. Cualquier migración a base de datos persistente requiere justificación explícita y aprobación en el plan de implementación.
4. **Validación siempre primero**: Los filtros de listado se validan con Zod antes de pasarse al repositorio.

---

## 🛠️ Endpoints de la API

| Método | Endpoint | Descripción | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/transactions` | Registra una nueva transacción | No |
| `GET` | `/api/transactions` | Lista transacciones con filtros opcionales | No |
| `GET` | `/health` | Healthcheck del servicio | No |

### POST /api/transactions

**Body (JSON)**:
```json
{
  "amount": 1500.50,
  "category": "food",
  "date": "2024-06-15T12:00:00.000Z",
  "description": "Almuerzo en restaurante"
}
```

| Campo | Tipo | Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| `amount` | `number` | ✅ | Monto positivo > 0 |
| `category` | `string` | ✅ | Categoría del gasto (ej: `food`, `transport`) |
| `date` | `string` | ✅ | Fecha en formato ISO 8601 |
| `description` | `string` | ❌ | Descripción opcional (máx. 255 chars) |

**Respuesta exitosa (201)**:
```json
{
  "message": "Transacción registrada exitosamente",
  "data": {
    "id": "txn_1718448000000_abc123",
    "amount": 1500.50,
    "category": "food",
    "date": "2024-06-15T12:00:00.000Z",
    "description": "Almuerzo en restaurante",
    "createdAt": "2024-06-15T12:00:00.000Z",
    "updatedAt": "2024-06-15T12:00:00.000Z"
  }
}
```

### GET /api/transactions

**Query params opcionales**:

| Parámetro | Tipo | Descripción |
| :--- | :--- | :--- |
| `category` | `string` | Filtra por categoría (case-insensitive) |
| `startDate` | `string` | Fecha mínima (ISO 8601, inclusive) |
| `endDate` | `string` | Fecha máxima (ISO 8601, inclusive) |

**Respuesta (200)**:
```json
{
  "data": [ /* array de transacciones */ ],
  "total": 3
}
```

> Los resultados se devuelven ordenados por fecha descendente (más reciente primero).

---

## ⚙️ Variables de Entorno

| Variable | Descripción | Valor por defecto |
| :--- | :--- | :--- |
| `PORT` | Puerto de escucha del servicio HTTP | `3002` |
| `NODE_ENV` | Entorno de ejecución | `development` |
| `CORS_ORIGIN` | Origen permitido para solicitudes CORS | `http://localhost:3000` |

---

## 🚀 Comandos Disponibles

```bash
# Instalar dependencias
npm install

# Modo desarrollo con recarga en caliente
npm run dev

# Ejecutar batería de tests automatizados
npm test

# Compilar TypeScript para producción
npm run build

# Iniciar en producción
npm start
```
