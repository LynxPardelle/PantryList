# PantryList

PantryList es un MVP para registrar inventario del hogar por tipo base y por
lote, con foco en caducidades visibles, consumo controlado por lote y una ruta
de crecimiento razonable para despliegue posterior en Dokploy o AWS.

## Estado actual

- Login ligero por `username` en frontend
- Modelo nuevo `ProductType` + `InventoryLot`
- Registro de compras como lotes con `expiresAt` y `purchaseDate`
- Vista agrupada por tipo base
- Panel visible de productos proximos a caducar
- Consumo explicito por lote, sin seleccion automatica
- Backend NestJS 11 + Fastify + MongoDB/Mongoose
- Frontend Angular 19 + NgRx + SSR
- Flujo de migracion desde la coleccion legacy `products`

## Stack

### Frontend

- Angular 19
- NgRx
- Bootstrap 5
- SSR con Express

### Backend

- NestJS 11
- Fastify
- Mongoose
- Arquitectura por dominio / casos de uso / infraestructura

## Modelo actual

- `ProductType`
  - representa el tipo base que importa para planear el hogar
  - ejemplos: `Atun`, `Jamon de pierna de pavo`, `Shampoo anticaspa`
- `InventoryLot`
  - representa una compra o bloque homogeneo con cantidad, variante y
    caducidad propia
- `PantryOverview`
  - agrega lotes por tipo base y entrega al frontend el resumen listo para
    renderizar
- El flujo legacy `/api/products` sigue presente solo como compatibilidad de
  transicion; la ruta principal nueva vive en `/api/product-types`,
  `/api/inventory-lots` y `/api/pantry/overview`

## Desarrollo local

### 1. Arranca todo con Docker Compose

La ruta mas simple en esta maquina ahora es levantar `frontend`, `backend` y
`mongodb` juntos con Docker Compose:

```bash
cp .env.docker.example .env.docker.local
docker compose --env-file .env.docker.local --profile app up -d --build
```

Esto levanta:

- MongoDB en `127.0.0.1:27017`
- backend en `http://localhost:3000/api`
- frontend en `http://localhost:4200`
- volumen persistente nombrado
- `healthcheck`
- usuario root separado del usuario de aplicacion
- usuario de aplicacion con permisos `readWrite` solo sobre `pantrylist`
- `restart: unless-stopped` para los tres servicios

En desarrollo, el navegador debe seguir viendo las llamadas API sobre
`http://localhost:4200/api/...`. Eso es intencional: el frontend Angular usa
`/api` como base relativa y el dev server reenvia esas solicitudes al backend
real en `http://localhost:3000`.

El `backend` ya no depende de un `DATABASE_URL` duplicado en el archivo Docker.
Ahora construye su conexion desde `MONGO_HOST`, `MONGO_PORT`,
`MONGO_APP_DATABASE`, `MONGO_APP_USERNAME` y `MONGO_APP_PASSWORD`, lo que evita
que se quede usando el password por defecto cuando ya existe un `.env.docker.local`.

Si prefieres seguir con `mongodb` en Docker y `frontend` / `backend` fuera de
contenedor, tambien sigue siendo valido:

```bash
docker compose --env-file .env.docker.local up -d mongodb
```

### Solucion de problemas del stack Docker local

- Si el navegador muestra errores contra `http://localhost:4200/api/...`, no
  cambies el frontend a `http://localhost:3000`. Primero valida el backend, ya
  que `localhost:4200/api` es el contrato correcto en desarrollo.
- Si `pantrylist-backend` queda en bucle con errores de TypeScript por modulos
  faltantes (`@nestjs/jwt`, `@fastify/cookie`, `argon2`), el contenedor tenia
  un `node_modules` de Docker desincronizado. El `docker-compose.yml` de
  desarrollo ahora ejecuta `npm ci --include=dev` al arrancar para reparar ese
  volumen antes de levantar NestJS y Angular.
- Si el backend sigue ejecutando logica vieja despues de un cambio de codigo,
  el compose de desarrollo ahora limpia `dist` y `tsconfig.tsbuildinfo` antes
  de entrar en `nest start --watch`, evitando que el contenedor arranque con
  artefactos compilados stale.
- Si `pantrylist-mongodb` queda `unhealthy` y los logs muestran
  `SCRAM authentication failed` o `storedKey mismatch`, tu volumen persistente
  fue inicializado con credenciales de una version anterior del stack. En ese
  caso tienes dos caminos:
- Mantener los datos existentes: usa en `.env.docker.local` exactamente las
  credenciales con las que se creo ese volumen historico.
- Si ese volumen viene del compose mas antiguo con `admin/password123`, puedes
  mantenerlo sin borrar datos forzando el backend a usar `DATABASE_URL` legacy:

```env
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=password123
MONGO_APP_USERNAME=admin
MONGO_APP_PASSWORD=password123
MONGO_HOST=
DATABASE_URL=mongodb://admin:password123@mongodb:27017/pantrylist?authSource=admin
```

- Reiniciar solo el entorno Docker local: si puedes perder esos datos de
  desarrollo, baja el stack y elimina el volumen antes de volver a levantarlo.

```bash
docker compose --profile app down
docker volume rm pantrylist_mongodb_data
docker compose --env-file .env.docker.local --profile app up -d --build
```

Ese reset es destructivo solo para la base local montada en Docker.

Ejemplo de `backend/.env`:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=mongodb://pantrylist_app:change-this-app-password@127.0.0.1:27017/pantrylist?authSource=pantrylist
DATABASE_NAME=pantrylist
API_PREFIX=api
CORS_ORIGIN=http://localhost:4200
HELMET_ENABLED=true
SWAGGER_ENABLED=true
SWAGGER_TITLE=PantryList API
SWAGGER_DESCRIPTION=PantryList API
SWAGGER_VERSION=1.0.0
```

### 2. Arranca el backend fuera de Docker

```bash
cd backend
npm install
npm start
```

La API queda en `http://localhost:3000/api`.
Swagger queda en `http://localhost:3000/api/docs` si `SWAGGER_ENABLED=true`.

### 3. Arranca el frontend fuera de Docker

```bash
cd frontend
npm install
npm start
```

La app queda en `http://localhost:4200`.
Usa `http://localhost:4200`, no `http://127.0.0.1:4200`, porque en esta
maquina el smoke test local respondio bien sobre `localhost` y rechazo
`127.0.0.1`.

## Scripts utiles

### Frontend

```bash
npm start
npm run build
npm test
npm run test:ci
```

### Backend

```bash
npm start
npm run start:dev
npm run lint
npm test
npm run test:e2e
npm run build
npm run migrate:product-types
```

## API nueva

- `POST /api/product-types`
- `GET /api/product-types?userId=...&search=...`
- `GET /api/product-types/:id?userId=...`
- `POST /api/inventory-lots`
- `GET /api/inventory-lots?userId=...`
- `GET /api/inventory-lots/expiring?userId=...&days=7`
- `POST /api/inventory-lots/:id/consume`
- `GET /api/pantry/overview?userId=...`

## Migracion

La migracion conserva los registros legacy de forma conservadora:

- crea un `ProductType` por producto legacy
- crea un `InventoryLot` inicial por producto legacy
- no inventa caducidades historicas
- usa `legacyProductId` para evitar duplicados al reejecutarse
- puede sembrar `legacy_account_claims` sin resetear reclamos ya existentes

Ejecucion:

```bash
cd backend
npm run migrate:product-types
```

Para poblar reclamos de cuentas legacy a partir de `products`,
`product_types` e `inventory_lots` sin sobreescribir registros ya
`claimed`/`claiming`, usa:

```bash
cd backend
npx ts-node ./scripts/seed-legacy-account-claims.ts
```

Ese comando corre en modo seguro (`dryRun`) por defecto y devuelve el listado
exacto de `legacyOwners` detectados. Para aplicar los upserts idempotentes en
`legacy_account_claims`, agrega `--apply`:

```bash
cd backend
npx ts-node ./scripts/seed-legacy-account-claims.ts --apply
```

Salida validada en esta maquina:

```json
{
  "status": "ok",
  "legacyProductCount": 2,
  "createdProductTypes": 2,
  "createdInventoryLots": 2,
  "skippedInventoryLots": 0
}
```

## Verificacion 2026-04-22

Verificacion de codigo:

- Frontend: `npm run build`
- Frontend: `npm run test:ci`
- Backend: `npm run lint`
- Backend: `npm test`
- Backend: `npm run test:e2e`
- Backend: `npm run build`

Verificacion de runtime:

- `npm audit --omit=dev --json` devolvio `0` vulnerabilidades de runtime en
  `frontend`
- `npm audit --omit=dev --json` devolvio `0` vulnerabilidades de runtime en
  `backend`
- `Invoke-WebRequest http://localhost:4200/login` devolvio `StatusCode = 200`
- `docker compose --env-file .env.docker.local --profile app ps` mostro
  `pantrylist-backend`, `pantrylist-frontend` y `pantrylist-mongodb` en estado
  `Up`, con MongoDB marcado como `healthy`
- `GET /api/inventory-lots/expiring?userId=lot-api-user&days=7` devolvio `2`
  lotes para el grupo de prueba
- `GET /api/inventory-lots/expiring?userId=lot-api-user&days=30` devolvio `3`
  lotes para el mismo grupo despues de registrar un lote estable adicional
- `GET /api/product-types/:id` sin `userId` devolvio `400`
- `GET /api/product-types/:id?userId=someone-else` devolvio `404`
- `GET /api/product-types/:id?userId=lot-api-user` devolvio `200`
- `GET /api/pantry/overview` sin `userId` devolvio `400`
- `GET /api/inventory-lots?userId=` devolvio `400`
- `npm run build` de `frontend` ya no emitio warning de presupuesto para
  `pantry-page.component.scss` despues de mover primitivas visuales al
  stylesheet global

Evidencia visual existente:

- `C:\Users\lince\Documents\GitHub\Codex\Output\pantrylist-expiration-smoke.png`
- `C:\Users\lince\Documents\GitHub\Codex\Output\pantrylist-smoke.png`

## Seguridad

- El backend usa Fastify y fuerza `fastify@5.8.5` con `overrides` para evitar
  el advisory que afectaba a `5.8.4`.
- MongoDB en Docker queda expuesto solo en `127.0.0.1:27017`.
- `GET /api/product-types/:id` ahora exige `userId` y no revela recursos de
  otro usuario por solo conocer el UUID.
- El guardado de `ProductType` ahora usa un upsert por
  `(userId, normalizedBaseName)` para reducir la ventana de duplicados por
  carreras en la ruta normal de la aplicacion.
- Riesgo residual: el proyecto sigue usando una frontera de sesion por
  `username` sin autenticacion real. Mientras eso siga asi, los endpoints que
  reciben `userId` desde el cliente no deben considerarse multiusuario seguros.
- Riesgo residual: el skill `audit` pide `/impeccable`, pero ese skill no esta
  disponible en esta sesion. La auditoria se ejecuto manualmente siguiendo sus
  criterios verificables.

## Skills evaluadas en esta pasada

- `create-implementation-plan`
  - util para convertir la especificacion aprobada en
    `plan/feature-expiration-lots-1.md`
- `frontend-skill`
  - aporto una direccion visual util para evitar que la UI quedara como un CRUD
    plano y sin jerarquia
- `agent-browser`
  - no fue confiable para esta app local en esta maquina
  - evidencia exacta observada antes del fallback: `chrome-error://chromewebdata/`
    y `agent-browser doctor --offline --quick --json` expiro por timeout
- `code-reviewer`
  - no se pudo usar porque el wrapper local devolvio el error exacto
    `config profile 'code-reviewer' not found`

## Dokploy

Para Dokploy no hace falta usar el flujo local con Docker Compose.

- Backend: configura `DATABASE_URL`, `DATABASE_NAME`, `API_PREFIX`,
  `CORS_ORIGIN`, `HELMET_ENABLED` y `SWAGGER_ENABLED`.
- Frontend SSR: si se despliega el servidor SSR, puedes definir `BACKEND_URL`
  para que el proxy del servidor apunte al backend correcto.
- Frontend estatico: si Dokploy sirve frontend y backend bajo el mismo dominio,
  `environment.prod.ts` ya usa `'/api'`.
- Si quieres una topologia de produccion local o una base para Dokploy segun el
  spec aprobado del `2026-04-23`, usa `docker-compose.prod.yml`.
- Ese compose mantiene `frontend` SSR publico, `backend` solo por red interna y
  MongoDB sin bind mounts de codigo.
- Variables obligatorias para ese flujo: `MONGO_INITDB_ROOT_USERNAME`,
  `MONGO_INITDB_ROOT_PASSWORD`, `MONGO_APP_USERNAME` y `MONGO_APP_PASSWORD`.
- Variables utiles para override: `DATABASE_NAME`, `FRONTEND_PORT`,
  `CORS_ORIGIN`, `API_PREFIX` y `BACKEND_URL`.
- Smoke local de produccion:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```
