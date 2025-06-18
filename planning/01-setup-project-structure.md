# 📁 Paso 1: Setup y Estructura del Proyecto

## Objetivo
Configurar la estructura base del proyecto con las tecnologías especificadas y preparar el entorno de desarrollo.

## Tareas

### 1.1 Estructura de Directorios
```
PantryList/
├── frontend/                 # Angular 20 app
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/        # Servicios singleton, guards, interceptors
│   │   │   ├── shared/      # Componentes, pipes, directivas compartidas
│   │   │   ├── features/    # Módulos de funcionalidades
│   │   │   └── store/       # NgRx store
│   │   ├── assets/
│   │   └── environments/
│   ├── angular.json
│   ├── package.json
│   └── tsconfig.json
├── backend/                  # NestJS app con Arquitectura Hexagonal
│   ├── src/
│   │   ├── application/     # Casos de uso y servicios de aplicación
│   │   │   ├── ports/       # Interfaces (puertos de entrada y salida)
│   │   │   ├── services/    # Servicios de aplicación
│   │   │   └── use-cases/   # Casos de uso específicos
│   │   ├── domain/          # Entidades de dominio y lógica de negocio
│   │   │   ├── entities/    # Entidades del dominio
│   │   │   ├── repositories/ # Interfaces de repositorios
│   │   │   └── services/    # Servicios de dominio
│   │   ├── infrastructure/  # Adaptadores y implementaciones
│   │   │   ├── database/    # Adaptadores de persistencia
│   │   │   ├── http/        # Controladores REST
│   │   │   ├── config/      # Configuraciones
│   │   │   └── external/    # Servicios externos
│   │   ├── shared/          # Utilidades compartidas
│   │   └── main.ts
│   ├── test/
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml
├── .github/
│   └── workflows/
└── README.md
```

### 1.2 Inicialización del Frontend
```bash
# Crear aplicación Angular 20
ng new frontend --style=scss --routing=true --standalone=false

# Instalar dependencias principales
cd frontend
npm install @angular/material @angular/cdk @angular/animations
npm install @ngrx/store @ngrx/effects @ngrx/store-devtools
npm install bootstrap ngx-bootstrap ngx-bootstrap-expanded-features

# Instalar dependencias de desarrollo
npm install --save-dev @angular/testing jasmine karma
```

### 1.3 Inicialización del Backend
```bash
# Crear aplicación NestJS
nest new backend

cd backend
# Instalar dependencias principales
npm install @nestjs/mongoose mongoose
npm install @nestjs/platform-fastify
npm install @nestjs/swagger
npm install @nestjs/config
npm install helmet
npm install joi class-validator class-transformer

# Instalar dependencias de desarrollo
npm install --save-dev @swc/core @swc/cli
npm install --save-dev @types/jest supertest
```

### 1.4 Configuración de MongoDB
```bash
# Docker Compose para MongoDB
# Agregar servicio MongoDB en docker-compose.yml
```

### 1.5 Configuración Inicial
- [ ] Configurar Angular Material con tema cálido
- [ ] Setup de ngx-bootstrap y ngx-bootstrap-expanded-features
- [ ] Setup de Bootstrap en Angular
- [ ] Configurar Fastify en NestJS
- [ ] Configurar SWC para compilación rápida
- [ ] Setup de MongoDB connection
- [ ] Configurar variables de entorno
- [ ] Establecer arquitectura hexagonal en backend

## Entregables
- ✅ Estructura de proyecto creada
- ✅ Dependencias instaladas
- ✅ Configuraciones básicas aplicadas
- ✅ Conexión a base de datos establecida
- ✅ Servidor development funcionando

## Tiempo estimado: 4-6 horas

## Siguiente paso: 02-core-architecture-patterns.md
