# Auth Service - Centavo 🪙🔐

Microservicio encargado de la gestión de identidad, control de acceso, registro, autenticación y verificación de sesiones para la plataforma Centavo.

---

## 📋 Directivas y Reglas de Seguridad (`AGENTS.MD`)

Este servicio opera bajo directivas estrictas de seguridad:
1. **Confidencialidad de Credenciales y Tokens en Logs**:
   - Bajo ninguna circunstancia se registran contraseñas en texto plano, hashes de contraseñas, ni tokens (JWT/Bearer) en logs de consola, archivos ni sistemas de observabilidad.
   - Todo log de solicitudes o errores pasa por un módulo de sanitización profunda (`logger.ts`).
2. **Validación Centralizada de Sesión**:
   - Toda validación de sesión (tanto interna en endpoints como en middlewares de protección) **debe pasar exclusivamente por el módulo central** `sessionValidator.ts`. No se permite duplicar ni crear verificaciones de tokens ad-hoc en otros módulos.
3. **Lógica de Hashing de Contraseñas**:
   - El hashing de contraseñas utiliza `bcrypt` con un factor de costo fijo de **12 rondas** (`SALT_ROUNDS = 12`).
   - Cualquier modificación futura al algoritmo o costo de hashing requiere justificación técnica explícita aprobada en el plan de implementación.

---

## 🛠️ Endpoints de la API

| Método | Endpoint | Descripción | Requiere Autenticación |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Registra un nuevo usuario en la plataforma. Retorna datos del usuario y JWT. | No |
| `POST` | `/api/auth/login` | Inicia sesión con email y contraseña. Retorna datos del usuario y JWT. | No |
| `GET` | `/api/auth/verify` | Valida la sesión activa mediante el módulo central. Retorna sesión sanitizada. | Sí (`Authorization: Bearer <token>`) |
| `GET` | `/api/auth/me` | Retorna los datos del perfil del usuario autenticado. | Sí (`Authorization: Bearer <token>`) |
| `GET` | `/health` | Healthcheck del servicio. | No |

---

## ⚙️ Variables de Entorno

| Variable | Descripción | Valor por defecto |
| :--- | :--- | :--- |
| `PORT` | Puerto de escucha del servicio HTTP | `3001` |
| `NODE_ENV` | Entorno de ejecución (`development`, `production`, `test`) | `development` |
| `JWT_SECRET` | Clave secreta para firma y verificación de tokens JWT | (Requerida en prod) |
| `JWT_EXPIRES_IN` | Tiempo de expiración del token JWT | `24h` |
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
