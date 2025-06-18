# 🏠 PantryList - Gestión Inteligente de Productos del Hogar

[![Build Status](https://github.com/yourusername/pantrylist/workflows/CI%2FCD%20Pipeline/badge.svg)](https://github.com/yourusername/pantrylist/actions)
[![Frontend](https://img.shields.io/badge/Frontend-Angular%2019-red)](https://angular.io/)
[![Backend](https://img.shields.io/badge/Backend-NestJS-red)](https://nestjs.com/)
[![Database](https://img.shields.io/badge/Database-MongoDB-green)](https://mongodb.com/)
[![Architecture](https://img.shields.io/badge/Architecture-Hexagonal-blue)](https://alistair.cockburn.us/hexagonal-architecture/)

Una aplicación moderna para gestionar productos del hogar con auto-programación inteligente de compras basada en patrones de uso histórico.

## 🚀 Características Principales

- **🔮 Auto-Scheduling**: Predicción automática de cuándo comprar productos
- **📱 Responsive Design**: Funciona perfectamente en móviles, tablets y desktop  
- **🎨 UI Moderna**: Diseño cálido y acogedor con Angular Material + ngx-bootstrap
- **⚡ Tiempo Real**: Actualizaciones en tiempo real con NgRx
- **🏗️ Arquitectura Hexagonal**: Backend escalable y mantenible
- **🐳 Docker Ready**: Containerización completa para desarrollo y producción

## 🛠️ Stack Tecnológico

### Frontend
- **Angular 19** con Angular Material y ngx-bootstrap
- **NgRx** para gestión de estado
- **Bootstrap 5** para diseño responsivo
- **TypeScript** para desarrollo tipado

### Backend  
- **NestJS** con Fastify (más rápido que Express)
- **MongoDB** con Mongoose ODM
- **Arquitectura Hexagonal** (Puertos y Adaptadores)
- **Swagger** para documentación API
- **Helmet** para seguridad HTTP

## 🚀 Inicio Rápido

### Con Docker (Recomendado)
```bash
git clone https://github.com/yourusername/pantrylist.git
cd pantrylist
docker-compose up -d
```

### Manual
```bash
# Frontend (Puerto 4200)
cd frontend && npm install && npm start

# Backend (Puerto 3000)  
cd backend && npm install && npm run start:dev

# MongoDB
docker run -d -p 27017:27017 mongo:7
```

## 📊 Algoritmo de Auto-Scheduling

### Ejemplo Práctico
**Aceite de Oliva**: 1lt actual, uso 2lt/mes → Comprar en 2 semanas
**Arroz**: 500g actual, uso 1kg cada 2 semanas → Comprar en 1 semana

### Fórmula
```typescript
dailyUsage = usageRate.amount / getPeriodInDays(usageRate.period)
daysRemaining = currentQuantity / dailyUsage  
nextPurchaseDate = today + (daysRemaining * 0.8) // 20% buffer
```

## 🏗️ Arquitectura

**Backend**: Arquitectura Hexagonal con separación clara entre Dominio, Aplicación e Infraestructura
**Frontend**: NgRx para gestión de estado reactivo
**Base de Datos**: MongoDB para flexibilidad en esquemas de productos

The color palette, should be cheerful and warm, like home.