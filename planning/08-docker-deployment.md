# 🐳 Paso 8: Docker y Deployment

## Objetivo

Configurar Docker para desarrollo y producción, implementar CI/CD con GitHub Actions y preparar deployment.

## Tareas

### 8.1 Docker para Backend

```dockerfile
# backend/Dockerfile
FROM node:18-alpine AS builder

# Instalar dependencias del sistema
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copiar package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copiar código fuente
COPY . .

# Build de la aplicación
RUN npm run build

# Imagen de producción
FROM node:18-alpine AS runner

RUN apk add --no-cache dumb-init

WORKDIR /app

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copiar dependencias y build
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

USER nestjs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["dumb-init", "node", "dist/main"]
```

### 8.2 Docker para Frontend

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./
RUN npm ci

# Copiar código fuente y build
COPY . .
RUN npm run build:prod

# Imagen de producción con Nginx
FROM nginx:alpine AS runner

# Copiar configuración custom de Nginx
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/dist/frontend /usr/share/nginx/html

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S angular -u 1001

# Cambiar ownership de archivos
RUN chown -R angular:nodejs /usr/share/nginx/html
RUN chown -R angular:nodejs /var/cache/nginx
RUN chown -R angular:nodejs /var/log/nginx
RUN chown -R angular:nodejs /etc/nginx/conf.d
RUN touch /var/run/nginx.pid
RUN chown -R angular:nodejs /var/run/nginx.pid

USER angular

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 8.3 Configuración Nginx

```nginx
# frontend/nginx.conf
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Configuración de logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Configuraciones de rendimiento
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Compresión
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        application/atom+xml
        application/geo+json
        application/javascript
        application/x-javascript
        application/json
        application/ld+json
        application/manifest+json
        application/rdf+xml
        application/rss+xml
        application/xhtml+xml
        application/xml
        font/eot
        font/otf
        font/ttf
        image/svg+xml
        text/css
        text/javascript
        text/plain
        text/xml;

    # Headers de seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: ws: wss: data: blob: 'unsafe-inline'; frame-ancestors 'self';" always;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # Configuración PWA
        location / {
            try_files $uri $uri/ /index.html;
            
            # Cache para assets estáticos
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }

        # Cache para manifest y service worker
        location ~* \.(webmanifest|json)$ {
            expires 1d;
            add_header Cache-Control "public";
        }

        # Service Worker - no cache
        location /sw.js {
            expires off;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }

        # Error pages
        error_page 404 /index.html;
        error_page 500 502 503 504 /50x.html;
        
        location = /50x.html {
            root /usr/share/nginx/html;
        }
    }
}
```

### 8.4 Docker Compose para Desarrollo

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Base de datos MongoDB
  mongodb:
    image: mongo:6.0
    container_name: pantrylist-mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password123
      MONGO_INITDB_DATABASE: pantrylist
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
      - ./mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    networks:
      - pantrylist-network

  # Backend NestJS
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: pantrylist-backend
    restart: unless-stopped
    environment:
      NODE_ENV: development
      PORT: 3000
      MONGODB_URI: mongodb://admin:password123@mongodb:27017/pantrylist?authSource=admin
      JWT_SECRET: your-super-secret-jwt-key
      FRONTEND_URL: http://localhost:4200
    ports:
      - "3000:3000"
    depends_on:
      - mongodb
    volumes:
      - ./backend:/app
      - /app/node_modules
    networks:
      - pantrylist-network
    command: npm run start:dev

  # Frontend Angular
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: pantrylist-frontend
    restart: unless-stopped
    environment:
      NODE_ENV: development
    ports:
      - "4200:4200"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    networks:
      - pantrylist-network
    command: npm run start

  # Redis para cache (opcional)
  redis:
    image: redis:7-alpine
    container_name: pantrylist-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - pantrylist-network

volumes:
  mongodb_data:
  redis_data:

networks:
  pantrylist-network:
    driver: bridge
```

### 8.5 Docker Compose para Producción

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    container_name: pantrylist-mongodb-prod
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
      MONGO_INITDB_DATABASE: ${MONGO_DATABASE}
    volumes:
      - mongodb_prod_data:/data/db
    networks:
      - pantrylist-prod-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: pantrylist-backend-prod
    restart: always
    environment:
      NODE_ENV: production
      PORT: 3000
      MONGODB_URI: ${MONGODB_URI}
      JWT_SECRET: ${JWT_SECRET}
      FRONTEND_URL: ${FRONTEND_URL}
    depends_on:
      - mongodb
    networks:
      - pantrylist-prod-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: pantrylist-frontend-prod
    restart: always
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    networks:
      - pantrylist-prod-network
    volumes:
      - ./ssl:/etc/nginx/ssl:ro
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Nginx Proxy Manager para SSL
  nginx-proxy:
    image: nginxproxymanager/nginx-proxy-manager:latest
    container_name: nginx-proxy-manager
    restart: always
    ports:
      - "80:80"
      - "81:81"
      - "443:443"
    volumes:
      - nginx_data:/data
      - nginx_letsencrypt:/etc/letsencrypt
    networks:
      - pantrylist-prod-network

volumes:
  mongodb_prod_data:
  nginx_data:
  nginx_letsencrypt:

networks:
  pantrylist-prod-network:
    driver: bridge
```

### 8.6 GitHub Actions CI/CD

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  NODE_VERSION: '18'
  REGISTRY: ghcr.io
  IMAGE_NAME_BACKEND: ${{ github.repository }}-backend
  IMAGE_NAME_FRONTEND: ${{ github.repository }}-frontend

jobs:
  # Test Backend
  test-backend:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:6.0
        env:
          MONGO_INITDB_ROOT_USERNAME: admin
          MONGO_INITDB_ROOT_PASSWORD: password123
        ports:
          - 27017:27017
        options: >-
          --health-cmd "mongosh --eval 'db.adminCommand(\"ping\")'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
        cache-dependency-path: backend/package-lock.json
    
    - name: Install backend dependencies
      working-directory: ./backend
      run: npm ci
    
    - name: Run backend tests
      working-directory: ./backend
      run: npm run test:ci
      env:
        MONGODB_URI: mongodb://admin:password123@localhost:27017/pantrylist-test?authSource=admin
    
    - name: Generate test coverage
      working-directory: ./backend
      run: npm run test:coverage
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./backend/coverage/lcov.info
        flags: backend

  # Test Frontend
  test-frontend:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
    
    - name: Install frontend dependencies
      working-directory: ./frontend
      run: npm ci
    
    - name: Run frontend tests
      working-directory: ./frontend
      run: npm run test:ci
    
    - name: Run e2e tests
      working-directory: ./frontend
      run: npm run e2e:ci
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./frontend/coverage/lcov.info
        flags: frontend

  # Build and Push Docker Images
  build-and-push:
    needs: [test-backend, test-frontend]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    permissions:
      contents: read
      packages: write
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Log in to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Extract metadata for backend
      id: backend-meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME_BACKEND }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha
          type=raw,value=latest,enable={{is_default_branch}}
    
    - name: Build and push backend image
      uses: docker/build-push-action@v5
      with:
        context: ./backend
        push: true
        tags: ${{ steps.backend-meta.outputs.tags }}
        labels: ${{ steps.backend-meta.outputs.labels }}
    
    - name: Extract metadata for frontend
      id: frontend-meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME_FRONTEND }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha
          type=raw,value=latest,enable={{is_default_branch}}
    
    - name: Build and push frontend image
      uses: docker/build-push-action@v5
      with:
        context: ./frontend
        push: true
        tags: ${{ steps.frontend-meta.outputs.tags }}
        labels: ${{ steps.frontend-meta.outputs.labels }}

  # Deploy to staging
  deploy-staging:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: staging
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Deploy to staging server
      uses: appleboy/ssh-action@v0.1.7
      with:
        host: ${{ secrets.STAGING_HOST }}
        username: ${{ secrets.STAGING_USER }}
        key: ${{ secrets.STAGING_SSH_KEY }}
        script: |
          cd /opt/pantrylist
          docker-compose -f docker-compose.staging.yml pull
          docker-compose -f docker-compose.staging.yml up -d
          docker system prune -f

  # Deploy to production (manual approval)
  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Deploy to production server
      uses: appleboy/ssh-action@v0.1.7
      with:
        host: ${{ secrets.PRODUCTION_HOST }}
        username: ${{ secrets.PRODUCTION_USER }}
        key: ${{ secrets.PRODUCTION_SSH_KEY }}
        script: |
          cd /opt/pantrylist
          docker-compose -f docker-compose.prod.yml pull
          docker-compose -f docker-compose.prod.yml up -d
          docker system prune -f
```

### 8.7 Scripts de Deployment

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

echo "🚀 Iniciando deployment de PantryList..."

# Variables
ENVIRONMENT=${1:-staging}
IMAGE_TAG=${2:-latest}

echo "📝 Configurando ambiente: $ENVIRONMENT"

# Verificar que Docker esté corriendo
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker no está corriendo"
    exit 1
fi

# Verificar que docker-compose esté disponible
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose no está instalado"
    exit 1
fi

# Crear directorios necesarios
mkdir -p logs
mkdir -p backup

# Backup de base de datos (solo en producción)
if [ "$ENVIRONMENT" = "production" ]; then
    echo "💾 Creando backup de base de datos..."
    docker-compose -f docker-compose.prod.yml exec -T mongodb mongodump \
        --host localhost \
        --username $MONGO_USERNAME \
        --password $MONGO_PASSWORD \
        --authenticationDatabase admin \
        --db pantrylist \
        --out /tmp/backup
    
    docker cp pantrylist-mongodb-prod:/tmp/backup ./backup/$(date +%Y%m%d_%H%M%S)
fi

# Pull de las últimas imágenes
echo "📦 Descargando últimas imágenes..."
docker-compose -f docker-compose.$ENVIRONMENT.yml pull

# Detener servicios
echo "⏹️ Deteniendo servicios..."
docker-compose -f docker-compose.$ENVIRONMENT.yml down

# Iniciar servicios
echo "🏃 Iniciando servicios..."
docker-compose -f docker-compose.$ENVIRONMENT.yml up -d

# Verificar que los servicios estén corriendo
echo "🔍 Verificando estado de servicios..."
sleep 30

if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Backend está corriendo"
else
    echo "❌ Backend no responde"
    exit 1
fi

if curl -f http://localhost > /dev/null 2>&1; then
    echo "✅ Frontend está corriendo"
else
    echo "❌ Frontend no responde"
    exit 1
fi

# Limpiar imágenes no utilizadas
echo "🧹 Limpiando imágenes no utilizadas..."
docker system prune -f

echo "🎉 Deployment completado exitosamente!"
echo "📊 Estado de servicios:"
docker-compose -f docker-compose.$ENVIRONMENT.yml ps
```

## Checklist de Implementación

### Docker Configuration
- [ ] Dockerfile para backend optimizado
- [ ] Dockerfile para frontend con Nginx
- [ ] Configuración Nginx para PWA
- [ ] Docker Compose para desarrollo
- [ ] Docker Compose para producción
- [ ] Variables de entorno configuradas

### CI/CD Pipeline
- [ ] GitHub Actions para tests automáticos
- [ ] Build y push de imágenes Docker
- [ ] Deploy automático a staging
- [ ] Deploy manual a producción con approval
- [ ] Coverage reports integrados
- [ ] Notificaciones de deployment

### Monitoring y Logs
- [ ] Configuración de logging
- [ ] Health checks para servicios
- [ ] Backup automático de BD
- [ ] Scripts de deployment
- [ ] Rollback procedures documentados

### Security
- [ ] Headers de seguridad en Nginx
- [ ] SSL/HTTPS configurado
- [ ] Secrets management
- [ ] Container security best practices
- [ ] Network isolation

## Entregables

- ✅ Dockerfiles optimizados creados
- ✅ CI/CD pipeline funcionando
- ✅ Deployment automático configurado
- ✅ Monitoring básico implementado
- ✅ Scripts de deployment creados
- ✅ Documentación de deployment

## Tiempo estimado: 8-12 horas

## Siguiente paso: 09-documentation-readme.md
