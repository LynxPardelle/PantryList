import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  COGNITO_AUTH_URL_BUILDER,
  COGNITO_TOKEN_CLIENT,
  COGNITO_TOKEN_VERIFIER,
  INVENTORY_LOT_DAO,
  INVENTORY_LOT_REPOSITORY,
  PRODUCT_DAO,
  PRODUCT_REPOSITORY,
  PRODUCT_TYPE_DAO,
  PRODUCT_TYPE_REPOSITORY,
  SCHEDULING_SERVICE,
  USER_DAO,
} from './application/tokens';
import { CognitoAuthTransactionService } from './application/services/cognito-auth-transaction.service';
import { CognitoProfileSyncService } from './application/services/cognito-profile-sync.service';
import { ConsumeInventoryLotUseCase } from './application/use-cases/consume-inventory-lot.use-case';
import { CreateInventoryLotUseCase } from './application/use-cases/create-inventory-lot.use-case';
import { CreateProductUseCase } from './application/use-cases/create-product.use-case';
import { CreateProductTypeUseCase } from './application/use-cases/create-product-type.use-case';
import { GetExpiringLotsUseCase } from './application/use-cases/get-expiring-lots.use-case';
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user.use-case';
import { GetProductByIdUseCase } from './application/use-cases/get-product-by-id.use-case';
import { GetProductTypeByIdUseCase } from './application/use-cases/get-product-type-by-id.use-case';
import { GetProductsByUserUseCase } from './application/use-cases/get-products-by-user.use-case';
import { GetPantryOverviewUseCase } from './application/use-cases/get-pantry-overview.use-case';
import { ListInventoryLotsUseCase } from './application/use-cases/list-inventory-lots.use-case';
import { SearchProductTypesUseCase } from './application/use-cases/search-product-types.use-case';
import { UpdateProductTypeDepletionRuleUseCase } from './application/use-cases/update-product-type-depletion-rule.use-case';
import { UpdateProductQuantityUseCase } from './application/use-cases/update-product-quantity.use-case';
import { SchedulingDomainService } from './domain/services/scheduling.service';
import { CognitoAuthUrlBuilderService } from './infrastructure/auth/cognito/cognito-auth-url-builder.service';
import { CognitoTokenClientService } from './infrastructure/auth/cognito/cognito-token-client.service';
import { CognitoTokenVerifierService } from './infrastructure/auth/cognito/cognito-token-verifier.service';
import { MongoInventoryLotRepository } from './infrastructure/database/mongodb/mongodb-inventory-lot.repository';
import { MongoProductRepository } from './infrastructure/database/mongodb/mongodb-product.repository';
import { MongoProductTypeRepository } from './infrastructure/database/mongodb/mongodb-product-type.repository';
import { MongoUserDao } from './infrastructure/database/mongodb/mongodb-user.dao';
import {
  InventoryLotDocument,
  InventoryLotSchema,
} from './infrastructure/database/mongodb/schemas/inventory-lot.schema';
import {
  ProductDocument,
  ProductSchema,
} from './infrastructure/database/mongodb/schemas/product.schema';
import {
  ProductTypeDocument,
  ProductTypeSchema,
} from './infrastructure/database/mongodb/schemas/product-type.schema';
import {
  UserDocument,
  UserSchema,
} from './infrastructure/database/mongodb/schemas/user.schema';
import { AuthCookieService } from './infrastructure/http/auth/auth-cookie.service';
import { AccessTokenGuard } from './infrastructure/http/auth/access-token.guard';
import { AuthController } from './infrastructure/http/controllers/auth.controller';
import { InventoryLotsController } from './infrastructure/http/controllers/inventory-lots.controller';
import { PantryController } from './infrastructure/http/controllers/pantry.controller';
import { ProductTypesController } from './infrastructure/http/controllers/product-types.controller';
import { ProductsController } from './infrastructure/http/controllers/products.controller';

const buildMongoUri = (configService: ConfigService): string => {
  const host = configService.get<string>('MONGO_HOST') ?? '127.0.0.1';
  const port = configService.get<string>('MONGO_PORT') ?? '27017';
  const username = configService.get<string>('MONGO_APP_USERNAME');
  const password = configService.get<string>('MONGO_APP_PASSWORD');
  const databaseName =
    configService.get<string>('MONGO_APP_DATABASE') ??
    configService.get<string>('DATABASE_NAME') ??
    'pantrylist';
  const explicitDatabaseUrl = configService.get<string>('DATABASE_URL');

  if (configService.get<string>('MONGO_HOST')) {
    if (username && password) {
      return `mongodb://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${databaseName}?authSource=${encodeURIComponent(databaseName)}`;
    }

    return `mongodb://${host}:${port}/${databaseName}`;
  }

  if (explicitDatabaseUrl) {
    return explicitDatabaseUrl;
  }

  if (username && password) {
    return `mongodb://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${databaseName}?authSource=${encodeURIComponent(databaseName)}`;
  }

  return `mongodb://${host}:${port}/${databaseName}`;
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
        PORT: Joi.number().port().default(3000),
        DATABASE_URL: Joi.string()
          .uri({ scheme: ['mongodb', 'mongodb+srv'] })
          .optional(),
        DATABASE_NAME: Joi.string().default('pantrylist'),
        MONGO_HOST: Joi.string().hostname().optional(),
        MONGO_PORT: Joi.number().port().optional(),
        MONGO_APP_DATABASE: Joi.string().optional(),
        MONGO_APP_USERNAME: Joi.string().optional(),
        MONGO_APP_PASSWORD: Joi.string().optional(),
        API_PREFIX: Joi.string().default('api'),
        CORS_ORIGIN: Joi.string().default('http://localhost:4200'),
        HELMET_ENABLED: Joi.string().valid('true', 'false').default('true'),
        AUTH_ACCESS_COOKIE_TTL_SECONDS: Joi.number()
          .integer()
          .positive()
          .default(900),
        AUTH_REFRESH_COOKIE_TTL_SECONDS: Joi.number()
          .integer()
          .positive()
          .default(2592000),
        COGNITO_ENABLED: Joi.string().valid('true', 'false').default('false'),
        COGNITO_ISSUER: Joi.when('COGNITO_ENABLED', {
          is: 'true',
          then: Joi.string()
            .uri({ scheme: ['https'] })
            .required(),
          otherwise: Joi.string()
            .uri({ scheme: ['https'] })
            .allow('')
            .optional(),
        }),
        COGNITO_DOMAIN: Joi.when('COGNITO_ENABLED', {
          is: 'true',
          then: Joi.string()
            .uri({ scheme: ['https'] })
            .required(),
          otherwise: Joi.string()
            .uri({ scheme: ['https'] })
            .allow('')
            .optional(),
        }),
        COGNITO_CLIENT_ID: Joi.when('COGNITO_ENABLED', {
          is: 'true',
          then: Joi.string().required(),
          otherwise: Joi.string().allow('').optional(),
        }),
        COGNITO_CLIENT_SECRET: Joi.string().allow('').optional(),
        COGNITO_REDIRECT_URI: Joi.when('COGNITO_ENABLED', {
          is: 'true',
          then: Joi.string()
            .uri({ scheme: ['http', 'https'] })
            .required(),
          otherwise: Joi.string()
            .uri({ scheme: ['http', 'https'] })
            .allow('')
            .optional(),
        }),
        COGNITO_LOGOUT_REDIRECT_URI: Joi.when('COGNITO_ENABLED', {
          is: 'true',
          then: Joi.string()
            .uri({ scheme: ['http', 'https'] })
            .required(),
          otherwise: Joi.string()
            .uri({ scheme: ['http', 'https'] })
            .allow('')
            .optional(),
        }),
        COGNITO_SCOPES: Joi.string().default('openid email profile'),
        COGNITO_ALLOWED_PROVIDERS: Joi.string().default(
          'Google,Facebook,COGNITO',
        ),
        COGNITO_AUTH_TRANSACTION_TTL_SECONDS: Joi.number()
          .integer()
          .positive()
          .default(300),
        AUTH_COOKIE_SECURE: Joi.string().valid('true', 'false').optional(),
        AUTH_COOKIE_SAME_SITE: Joi.string()
          .valid('lax', 'strict', 'none')
          .default('lax'),
        AUTH_COOKIE_DOMAIN: Joi.string().allow('').optional(),
        SWAGGER_ENABLED: Joi.string().valid('true', 'false').default('false'),
        SWAGGER_TITLE: Joi.string().default('PantryList API'),
        SWAGGER_DESCRIPTION: Joi.string().default(
          'API for managing household products and shopping schedules',
        ),
        SWAGGER_VERSION: Joi.string().default('1.0'),
      }),
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: buildMongoUri(configService),
        dbName:
          configService.get<string>('MONGO_APP_DATABASE') ??
          configService.get<string>('DATABASE_NAME') ??
          'pantrylist',
      }),
    }),
    MongooseModule.forFeature([
      { name: ProductDocument.name, schema: ProductSchema },
      { name: ProductTypeDocument.name, schema: ProductTypeSchema },
      { name: InventoryLotDocument.name, schema: InventoryLotSchema },
      { name: UserDocument.name, schema: UserSchema },
    ]),
  ],
  controllers: [
    AppController,
    AuthController,
    ProductsController,
    ProductTypesController,
    InventoryLotsController,
    PantryController,
  ],
  providers: [
    AppService,
    AuthCookieService,
    AccessTokenGuard,
    CognitoAuthTransactionService,
    CognitoProfileSyncService,
    CognitoAuthUrlBuilderService,
    CognitoTokenClientService,
    CognitoTokenVerifierService,
    GetCurrentUserUseCase,
    CreateProductUseCase,
    CreateProductTypeUseCase,
    CreateInventoryLotUseCase,
    ConsumeInventoryLotUseCase,
    GetProductByIdUseCase,
    GetProductsByUserUseCase,
    GetProductTypeByIdUseCase,
    GetPantryOverviewUseCase,
    GetExpiringLotsUseCase,
    ListInventoryLotsUseCase,
    SearchProductTypesUseCase,
    UpdateProductTypeDepletionRuleUseCase,
    UpdateProductQuantityUseCase,
    MongoUserDao,
    MongoProductRepository,
    MongoProductTypeRepository,
    MongoInventoryLotRepository,
    {
      provide: USER_DAO,
      useExisting: MongoUserDao,
    },
    {
      provide: PRODUCT_REPOSITORY,
      useExisting: MongoProductRepository,
    },
    {
      provide: PRODUCT_DAO,
      useExisting: MongoProductRepository,
    },
    {
      provide: PRODUCT_TYPE_REPOSITORY,
      useExisting: MongoProductTypeRepository,
    },
    {
      provide: PRODUCT_TYPE_DAO,
      useExisting: MongoProductTypeRepository,
    },
    {
      provide: INVENTORY_LOT_REPOSITORY,
      useExisting: MongoInventoryLotRepository,
    },
    {
      provide: INVENTORY_LOT_DAO,
      useExisting: MongoInventoryLotRepository,
    },
    {
      provide: SCHEDULING_SERVICE,
      useClass: SchedulingDomainService,
    },
    {
      provide: COGNITO_AUTH_URL_BUILDER,
      useExisting: CognitoAuthUrlBuilderService,
    },
    {
      provide: COGNITO_TOKEN_CLIENT,
      useExisting: CognitoTokenClientService,
    },
    {
      provide: COGNITO_TOKEN_VERIFIER,
      useExisting: CognitoTokenVerifierService,
    },
  ],
})
export class AppModule {}
