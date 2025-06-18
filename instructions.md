# 🏠 Descripción del proyecto

Aplicación de gestión de productos del hogar con arquitectura escalable y buenas prácticas. La aplicación ayudará a los usuarios a rastrear productos recurrentes del hogar que necesitan comprar, creando automáticamente un cronograma para ir al supermercado cada n días, semanas o meses.

## 🛠 Requisitos funcionales

### Frontend

- Pantalla de login con nombre de usuario.
- Vista principal de productos con:
    - Lista de productos del hogar
    - Información de cada producto: título, cantidad actual, uso estimado
    - Próxima fecha de compra calculada automáticamente
    - Estado visual (próximo a agotarse, disponible, agotado)
- Formulario para agregar/editar productos:
    - Título del producto
    - Cantidad actual (con unidades: lt, kg, g, piezas, etc.)
    - Uso promedio por período (día, semana, mes, año)
- Auto-cálculo del cronograma de compras basado en:
    - Cantidad actual disponible
    - Patrón de uso histórico del usuario
    - Predicción de cuándo se agotará el producto
- Vista de calendario/cronograma de compras
- Validación básica (campos obligatorios, formatos de cantidad)
- Diseño con paleta de colores cálida y acogedora (como el hogar)

### Backend
- API para:
    - CRUD de productos del hogar
    - Cálculo automático de cronogramas de compra
    - Historial de uso y patrones de consumo
    - Obtener lista paginada de productos
- Algoritmo de auto-scheduling:
    - Análisis de patrones de uso histórico
    - Predicción de fechas de reposición
    - Ajuste automático basado en consumo real
- Persistencia en base de datos MongoDB
- Código limpio y escalable:
    - Arquitectura Hexagonal (Puertos y Adaptadores)
    - Principios SOLID, DRY y Clean Code
    - Separación clara entre dominio, aplicación e infraestructura
    - Repositorios como puertos de salida
    - Manejo de errores y logs

**Ejemplos de auto-scheduling:**
- Ejemplo 1: Producto: "Aceite de oliva", Cantidad: 1lt, Uso: 2lt por mes → Auto-programar: próxima compra en 2 semanas
- Ejemplo 2: Producto: "Arroz", Cantidad: 500g, Uso: 1kg por 2 semanas → Auto-programar: próxima compra en 1 semana

## ⚙️ Requisitos técnicos

### Stack

- **Frontend:** Angular 20 con Angular Material, Bootstrap, ngx-bootstrap y ngx-bootstrap-expanded-features
- **State Management:** NgRx
- **Backend:** Node.js con NestJS utilizando fastify y swc
- **Base de datos:** MongoDB
- **Arquitectura obligatoria:**
  - Arquitectura Hexagonal (Puertos y Adaptadores) para el backend
  - Separación clara entre dominio, aplicación e infraestructura

### Características

- ✅ test unitarios en frontend (ej. Jasmine, Karma)
- ✅ test unitarios en backend (ej. jest, supertest)
- ✅ Proyecto estructurado como en producción
- ✅ Implementación de Arquitectura Hexagonal con puertos y adaptadores
- ✅ Separación clara entre capas de dominio, aplicación e infraestructura
- ✅ README.md con: instrucciones, patrones usados, algoritmo de auto-scheduling, decisiones arquitectónicas

### 🔐 Seguridad
- Sanitizar entradas para prevenir XSS
- Validar estructura de datos en backend (DTOs, Joi, etc.)
- Usar helmet o configuración básica de headers HTTP
- Escapar correctamente contenido HTML

### 🎨 UI/UX

- Diseño responsivo para móviles y tablets
- Paleta de colores cálida y acogedora (tonos tierra, naranjas suaves, verdes naturales)
- Iconografía relacionada con el hogar y productos domésticos
- Animaciones suaves y transiciones agradables
- Modo oscuro/claro

### 🚀 Funcionalidades avanzadas

- Notificaciones push para recordar compras
- Categorización de productos (limpieza, comida, higiene, etc.)
- Código de barras scanner para agregar productos rápidamente
- Integración con listas de supermercados
- Exportar lista de compras
- Historial de compras y análisis de gastos
- Sincronización entre dispositivos

### 🧪 Testing y Deploy

- E2E test (ej: Cypress o Playwright)
- Docker / Docker Compose
- Github Actions para CI/CD.
- PWA (Progressive Web App) para uso móvil
- Performance y Observabilidad con K8, Artillery y Graphana.