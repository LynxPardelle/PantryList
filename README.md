# PantryList

PantryList es un MVP para registrar inventario del hogar por tipo base y por
lote, con foco en caducidades visibles, durabilidad estimada, consumo
controlado por lote y una ruta de crecimiento razonable para despliegue
posterior en Dokploy o AWS.

## Estado actual

- Autenticacion reemplazada por Amazon Cognito Hosted UI: PantryList ya no
  registra ni valida passwords locales en el flujo activo
- Perfil local `users` conservado para propiedad de despensa, con
  `User.id = Cognito sub`
- Modelo nuevo `ProductType` + `InventoryLot`
- Registro de compras como lotes con `expiresAt` y `purchaseDate`
- Vista agrupada por tipo base
- Panel visible de productos proximos a caducar
- Panel visible de productos que se agotan pronto por durabilidad estimada
- Plan de compras deterministico basado en agotamiento estimado
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
  - puede incluir una regla opcional `defaultDepletionRule` para estimar
    durabilidad por tipo base
- `InventoryLot`
  - representa una compra o bloque homogeneo con cantidad, variante y
    caducidad propia
  - no guarda reglas de durabilidad; las cantidades manuales del lote siguen
    siendo la fuente persistida para ajustes reales
- `PantryOverview`
  - agrega lotes por tipo base y entrega al frontend el resumen listo para
    renderizar
  - calcula `estimatedCurrentQuantity`, `estimatedConsumedQuantity`,
    `estimatedDepletionAt` y `depletingItems` en lectura, sin mutar inventario
  - expone `shoppingPlanItems` como cronograma simple de reposicion: comprar
    tres dias antes del agotamiento estimado, o hoy si ya esta vencido
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

- MongoDB en `127.0.0.1:37917`
- backend en `http://localhost:39173/api`
- frontend en `http://localhost:48673`
- volumen persistente nombrado
- `healthcheck`
- usuario root separado del usuario de aplicacion
- usuario de aplicacion con permisos `readWrite` solo sobre `pantrylist`
- `restart: unless-stopped` para los tres servicios

En desarrollo, el navegador debe seguir viendo las llamadas API sobre
`http://localhost:48673/api/...`. Eso es intencional: el frontend Angular usa
`/api` como base relativa y el dev server reenvia esas solicitudes al backend
real dentro de Docker en `http://backend:3000`.

Los puertos publicados del host son intencionalmente altos y poco comunes para
que este stack pueda quedarse arriba sin chocar con otros proyectos. Puedes
cambiarlos en `.env.docker.local` con `PANTRYLIST_MONGO_HOST_PORT`,
`PANTRYLIST_BACKEND_HOST_PORT` y `PANTRYLIST_FRONTEND_HOST_PORT`.

El `backend` ya no depende de un `DATABASE_URL` duplicado en el archivo Docker.
Ahora construye su conexion desde `MONGO_HOST`, `MONGO_PORT`,
`MONGO_APP_DATABASE`, `MONGO_APP_USERNAME` y `MONGO_APP_PASSWORD`, lo que evita
que se quede usando el password por defecto cuando ya existe un `.env.docker.local`.

La autenticacion Cognito queda desactivada por defecto en
`.env.docker.example` para que el stack local pueda arrancar sin un User Pool
real. Al habilitarla, registra en Cognito el callback local:

```text
http://localhost:48673/api/auth/cognito/callback
```

Con `COGNITO_ENABLED=true`, configura tambien `COGNITO_ISSUER`,
`COGNITO_DOMAIN`, `COGNITO_CLIENT_ID`, `COGNITO_REDIRECT_URI` y
`COGNITO_LOGOUT_REDIRECT_URI`. Si esas variables no existen, los endpoints de
auth fallan cerrados en vez de volver al login local con password.

Si prefieres seguir con `mongodb` en Docker y `frontend` / `backend` fuera de
contenedor, tambien sigue siendo valido:

```bash
docker compose --env-file .env.docker.local up -d mongodb
```

### Solucion de problemas del stack Docker local

- Si el navegador muestra errores contra `http://localhost:48673/api/...`, no
  cambies el frontend a `http://localhost:39173`. Primero valida el backend, ya
  que `localhost:48673/api` es el contrato correcto en desarrollo.
- Si `pantrylist-backend` queda en bucle con errores de TypeScript por modulos
  faltantes de Node/Nest, el contenedor tenia
  un `node_modules` de Docker desincronizado. El `docker-compose.yml` de
  desarrollo ahora ejecuta `npm ci --include=dev` al arrancar para reparar ese
  volumen antes de levantar NestJS y Angular.
- Si el backend sigue ejecutando logica vieja despues de un cambio de codigo,
  el compose de desarrollo ahora limpia `dist` y `tsconfig.tsbuildinfo` antes
  de entrar en `nest start --watch`, evitando que el contenedor arranque con
  artefactos compilados stale.
- Si `pantrylist-mongodb` queda `unhealthy` y los logs muestran
  `SCRAM authentication failed` o `storedKey mismatch`, tu volumen persistente
  fue inicializado con credenciales de una version anterior del stack. Primero
  intenta la reparacion no destructiva; el script no imprime secretos y actualiza
  solo usuarios de MongoDB para que coincidan con `.env.docker.local`:

```powershell
.\docker\mongodb\Repair-DockerMongoCredentials.ps1 -EnvFile .env.docker.local
```

- Si conoces las credenciales historicas exactas con las que se creo el volumen,
  tambien puedes restaurarlas en `.env.docker.local` y reiniciar el stack.
- Reiniciar solo el entorno Docker local es la opcion destructiva: si puedes
  perder esos datos de desarrollo, baja el stack y elimina el volumen antes de
  volver a levantarlo.

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
DATABASE_URL=mongodb://pantrylist_app:change-this-app-password@127.0.0.1:37917/pantrylist?authSource=pantrylist
DATABASE_NAME=pantrylist
API_PREFIX=api
CORS_ORIGIN=http://localhost:48673
HELMET_ENABLED=true
SWAGGER_ENABLED=true
SWAGGER_TITLE=PantryList API
SWAGGER_DESCRIPTION=PantryList API
SWAGGER_VERSION=1.0.0
COGNITO_ENABLED=false
AUTH_ACCESS_COOKIE_TTL_SECONDS=900
AUTH_REFRESH_COOKIE_TTL_SECONDS=2592000
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

### Cognito AWS/CDK

```bash
cd infra/cognito
npm ci
npm run build
npm run synth
```

La configuracion repetible de Cognito vive en `infra/cognito`; la guia de
despliegue esta en `docs/deployment/cognito.md`.

## API nueva

- `GET /api/auth/cognito/login`
- `GET /api/auth/cognito/callback`
- `GET /api/auth/me`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/product-types`
- `GET /api/product-types?search=...`
- `GET /api/product-types/:id`
- `PATCH /api/product-types/:id/depletion-rule`
- `POST /api/inventory-lots`
- `GET /api/inventory-lots`
- `GET /api/inventory-lots/expiring?days=7`
- `POST /api/inventory-lots/:id/consume`
- `GET /api/pantry/overview`

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
- `Invoke-WebRequest http://localhost:48673/login` devolvio `StatusCode = 200`
- `docker compose --env-file .env.docker.local --profile app ps` mostro
  `pantrylist-backend`, `pantrylist-frontend` y `pantrylist-mongodb` en estado
  `Up`, con MongoDB marcado como `healthy`
- `GET /api/inventory-lots/expiring?userId=lot-api-user&days=7` devolvio `2`
  lotes para el grupo de prueba
- `GET /api/inventory-lots/expiring?userId=lot-api-user&days=30` devolvio `3`
  lotes para el mismo grupo despues de registrar un lote estable adicional
- Las verificaciones antiguas con `userId` por query quedaron superadas por
  la autenticacion actual con cookies y `AccessTokenGuard`.
- `npm run build` de `frontend` ya no emitio warning de presupuesto para
  `pantry-page.component.scss` despues de mover primitivas visuales al
  stylesheet global
- `GET /api/pantry/overview` ahora incluye `shoppingPlanItems` para tipos con
  durabilidad activa; el plan sugiere una compra de una ventana de consumo y
  ordena por `recommendedPurchaseAt`
- Smoke de durabilidad en navegador sobre Docker registro
  `Detergente smoke 411900`; despues de crear el lote devolvio
  `totalQuantity = 4`, `estimatedCurrentQuantity = 1`,
  `estimatedConsumedQuantity = 3` y `depletingCount = 1`
- El mismo smoke consumio manualmente `1 lt` desde el lote y el overview quedo
  en `totalQuantity = 3`, `estimatedCurrentQuantity = 0`,
  `estimatedConsumedQuantity = 3`, `hasDepletionRule = true`

Evidencia visual existente:

- `C:\Users\lince\Documents\GitHub\Codex\Output\pantrylist-expiration-smoke.png`
- `C:\Users\lince\Documents\GitHub\Codex\Output\pantrylist-smoke.png`
- `C:\Users\lince\Documents\GitHub\Codex\Output\pantrylist-durability-smoke.png`

## Seguridad

- El backend usa Fastify y fuerza `fastify@5.8.5` con `overrides` para evitar
  el advisory que afectaba a `5.8.4`.
- MongoDB en Docker queda expuesto solo en `127.0.0.1:37917`.
- Las rutas principales de pantry, lotes, tipos base y productos legacy usan
  `AccessTokenGuard` y derivan el usuario desde `@CurrentUser()`, no desde
  `userId` enviado por el cliente.
- El guardado de `ProductType` ahora usa un upsert por
  `(userId, normalizedBaseName)` para reducir la ventana de duplicados por
  carreras en la ruta normal de la aplicacion.
- Las estimaciones de durabilidad se calculan dinamicamente al leer el overview
  y no mutan cantidades ni borran lotes de forma automatica.
- Riesgo residual: el flujo de recuperacion de password usa `LogMailSenderService`
  en desarrollo; falta integrar un proveedor real de email antes de produccion.
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

Para Dokploy no hace falta usar el flujo local de desarrollo con `ng serve` y
watchers. Usa `docker-compose.prod.yml`, que construye imagenes de runtime,
sirve el frontend SSR en un proceso Node estable y mantiene backend/MongoDB
solo en la red interna.

- Backend: configura `DATABASE_URL`, `DATABASE_NAME`, `API_PREFIX`,
  `CORS_ORIGIN`, `HELMET_ENABLED` y `SWAGGER_ENABLED`.
- Frontend SSR: si se despliega el servidor SSR, puedes definir `BACKEND_URL`
  para que el proxy del servidor apunte al backend correcto.
- Frontend SSR/proxy: el navegador llama `/api` en el mismo dominio del
  frontend; el servidor SSR reenvia esas llamadas a `BACKEND_URL`.
- Si quieres una topologia de produccion local o una base para Dokploy segun el
  spec aprobado del `2026-04-23`, usa `docker-compose.prod.yml`.
- Ese compose mantiene `frontend` SSR publico, `backend` solo por red interna y
  MongoDB sin bind mounts de codigo.
- Variables obligatorias para ese flujo: `MONGO_INITDB_ROOT_USERNAME`,
  `MONGO_INITDB_ROOT_PASSWORD`, `MONGO_APP_USERNAME`, `MONGO_APP_PASSWORD`,
  `COGNITO_ENABLED=true`, `COGNITO_ISSUER`, `COGNITO_DOMAIN`,
  `COGNITO_CLIENT_ID`, `COGNITO_REDIRECT_URI` y
  `COGNITO_LOGOUT_REDIRECT_URI`.
- Para crear esos valores con infraestructura versionada, usa el CDK app en
  `infra/cognito`.
- Variables utiles para override: `DATABASE_NAME`, `FRONTEND_PORT`,
  `CORS_ORIGIN`, `API_PREFIX`, `BACKEND_URL`, `AUTH_COOKIE_SECURE`,
  `AUTH_COOKIE_SAME_SITE` y `AUTH_COOKIE_DOMAIN`.
- Revisa `docs/deployment/dokploy.md` y copia
  `.env.production.example` a un archivo local no versionado para pruebas.
- Smoke local de produccion:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production.local up -d --build
```
