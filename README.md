# Centavo 🪙

**Centavo** es una aplicación de finanzas personales para uso individual, orientada a registrar gastos, gestionar presupuestos y emitir alertas tempranas de sobregasto.

El proyecto está diseñado bajo una arquitectura de microservicios contenida en este monorepo, separando las responsabilidades de dominio para asegurar escalabilidad, modularidad e independencia técnica.

---

## 🏛️ Arquitectura del Sistema

A continuación se presenta un diagrama de arquitectura simple que describe la relación entre el frontend (Dashboard), los microservicios y sus interacciones principales:

```mermaid
flowchart TD
    UI[Frontend / Dashboard]

    UI --> AUTH[auth-service: Autenticación]
    UI --> TX[transactions-service: Gastos]
    UI --> BUDGETS[budgets-service: Presupuestos]
    UI --> NOTIF[notifications-service: Alertas]
    UI --> REPORTS[reports-service: Reportes]

    TX -. Notifica gasto .-> BUDGETS
    BUDGETS -. Alerta sobregasto .-> NOTIF
    TX -. Datos acumulados .-> REPORTS
```

---

## 📦 Estructura del Monorepo y Propósito de cada Componente

| Módulo / Servicio | Propósito | Responsabilidades Clave |
| :--- | :--- | :--- |
| **`frontend/`** | **Dashboard & UI** | Interfaz de usuario intuitiva y responsive. Permite la visualización de balances, carga de transacciones, configuración de metas/presupuestos y lectura de alertas y reportes. |
| **`auth-service/`** | **Autenticación** | Gestión de identidad del usuario, emisión y validación de tokens (JWT), control de acceso y seguridad de credenciales. |
| **`transactions-service/`** | **Transacciones** | Registro, edición, eliminación y categorización de movimientos financieros (ingresos y gastos). Actúa como fuente de verdad del historial transaccional. |
| **`budgets-service/`** | **Presupuestos** | Definición y seguimiento de presupuestos por categoría y periodo (mensual, semanal). Compara el gasto acumulado en tiempo real contra los umbrales fijados. |
| **`notifications-service/`** | **Alertas** | Monitoreo y entrega de advertencias al usuario cuando se acerca al límite o se produce un sobregasto en un presupuesto. Soporta notificaciones in-app, correo electrónico o push. |
| **`reports-service/`** | **Reportes** | Agregación de métricas y generación automática de balances periódicos (mensuales/anuales), exportaciones (PDF/CSV) y análisis de tendencias de consumo. |

---

## 🚀 Próximos Pasos

1. **Definir especificación de APIs y contratos** (OpenAPI / AsyncAPI / GraphQL / gRPC).
2. **Inicializar los esqueletos de carpetas** para cada servicio con sus respectivas dependencias y configuraciones.
3. **Establecer la estrategia de comunicación entre microservicios** (HTTP/REST síncrono para lecturas directas y Broker/Eventos como RabbitMQ/Kafka/Redis para eventos de sobregasto y transacciones).
4. **Configurar el entorno de desarrollo local** (Docker Compose, variables de entorno y scripts de arranque).
