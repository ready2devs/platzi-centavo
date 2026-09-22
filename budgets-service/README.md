# Budgets Service - Centavo 🪙📊

Microservicio encargado de la definición, almacenamiento y consulta de presupuestos por categoría y periodo para la plataforma Centavo.

---

## 📋 Directivas (`AGENTS.MD`)

1. **Integridad de datos**: Los montos límite (`limitAmount`) siempre deben ser números positivos mayores a cero.
2. **Validación de periodos y categorías**: Tanto `category` como `period` son obligatorios y deben normalizarse (`trim` y consistencia en mayúsculas/minúsculas).
3. **Repositorio in-memory temporal**: El almacenamiento actual es en memoria mediante `InMemoryBudgetRepository`. Cualquier migración a base de datos persistente requiere justificación explícita y aprobación previa en el plan de implementación.
4. **Validación siempre primero**: Todas las entradas (cuerpo de peticiones y parámetros de consulta) se validan con Zod antes de alcanzar la capa de servicios o repositorio.

---

## 🛠️ Endpoints de la API

| Método | Endpoint | Descripción | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/budgets` | Define un nuevo presupuesto | No |
| `GET` | `/api/budgets` | Consulta y filtra presupuestos existentes | No |
| `GET` | `/health` | Healthcheck del microservicio | No |

### POST /api/budgets

**Body (JSON)**:
```json
{
  "category": "food",
  "limitAmount": 5000.00,
  "period": "monthly",
  "description": "Presupuesto mensual para alimentación y salidas"
}
```

| Campo | Tipo | Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| `category` | `string` | ✅ | Categoría del presupuesto (ej: `food`, `entertainment`) |
| `limitAmount` | `number` | ✅ | Monto límite asignado (> 0) |
| `period` | `string` | ✅ | Periodo de vigencia (ej: `monthly`, `weekly`, `yearly`, `daily`) |
| `description` | `string` | ❌ | Descripción o notas adicionales (máx. 255 caracteres) |

**Respuesta exitosa (201)**:
```json
{
  "message": "Presupuesto registrado exitosamente",
  "data": {
    "id": "bgt_1718448000000_abc123",
    "category": "food",
    "limitAmount": 5000.00,
    "period": "monthly",
    "description": "Presupuesto mensual para alimentación y salidas",
    "createdAt": "2024-06-15T12:00:00.000Z",
    "updatedAt": "2024-06-15T12:00:00.000Z"
  }
}
```

### GET /api/budgets

**Query params opcionales**:

| Parámetro | Tipo | Descripción |
| :--- | :--- | :--- |
| `category` | `string` | Filtra por categoría (búsqueda case-insensitive) |
| `period` | `string` | Filtra por periodo (búsqueda case-insensitive) |

**Respuesta (200)**:
```json
{
  "data": [ /* array de presupuestos */ ],
  "total": 1
}
```

---

## ⚙️ Variables de Entorno

| Variable | Descripción | Valor por defecto |
| :--- | :--- | :--- |
| `PORT` | Puerto de escucha del servicio HTTP | `3003` |
| `NODE_ENV` | Entorno de ejecución | `development` |
| `CORS_ORIGIN` | Origen permitido para solicitudes CORS | `http://localhost:3000` |

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
