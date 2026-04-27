import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  INVENTORY_LOT_DAO,
  INVENTORY_LOT_REPOSITORY,
  JWT_SESSION_SERVICE,
  LEGACY_ACCOUNT_CLAIM_DAO,
  MAIL_SENDER,
  PASSWORD_CREDENTIAL_DAO,
  PASSWORD_HASHER,
  PASSWORD_RESET_TOKEN_DAO,
  PRODUCT_DAO,
  PRODUCT_REPOSITORY,
  PRODUCT_TYPE_DAO,
  PRODUCT_TYPE_REPOSITORY,
  REFRESH_SESSION_DAO,
  SCHEDULING_SERVICE,
  TOKEN_HASHER,
  USER_DAO,
} from './application/tokens';
import { AuthSessionService } from './application/services/auth-session.service';
import { ClaimImportedAccountUseCase } from './application/use-cases/claim-imported-account.use-case';
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
import { LoginUserUseCase } from './application/use-cases/login-user.use-case';
import { LogoutUserUseCase } from './application/use-cases/logout-user.use-case';
import { RefreshAuthSessionUseCase } from './application/use-cases/refresh-auth-session.use-case';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { RequestPasswordResetUseCase } from './application/use-cases/request-password-reset.use-case';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.use-case';
import { SearchProductTypesUseCase } from './application/use-cases/search-product-types.use-case';
import { UpdateProductTypeDepletionRuleUseCase } from './application/use-cases/update-product-type-depletion-rule.use-case';
import { UpdateProductQuantityUseCase } from './application/use-cases/update-product-quantity.use-case';
import { SchedulingDomainService } from './domain/services/scheduling.service';
import { MongoLegacyAccountClaimDao } from './infrastructure/database/mongodb/mongodb-legacy-account-claim.dao';
import { MongoInventoryLotRepository } from './infrastructure/database/mongodb/mongodb-inventory-lot.repository';
import { MongoPasswordCredentialDao } from './infrastructure/database/mongodb/mongodb-password-credential.dao';
import { MongoPasswordResetTokenDao } from './infrastructure/database/mongodb/mongodb-password-reset-token.dao';
import { MongoProductRepository } from './infrastructure/database/mongodb/mongodb-product.repository';
import { MongoProductTypeRepository } from './infrastructure/database/mongodb/mongodb-product-type.repository';
import { MongoRefreshSessionDao } from './infrastructure/database/mongodb/mongodb-refresh-session.dao';
import { MongoUserDao } from './infrastructure/database/mongodb/mongodb-user.dao';
import {
  InventoryLotDocument,
  InventoryLotSchema,
} from './infrastructure/database/mongodb/schemas/inventory-lot.schema';
import {
  LegacyAccountClaimDocument,
  LegacyAccountClaimSchema,
} from './infrastructure/database/mongodb/schemas/legacy-account-claim.schema';
import {
  PasswordCredentialDocument,
  PasswordCredentialSchema,
} from './infrastructure/database/mongodb/schemas/password-credential.schema';
import {
  PasswordResetTokenDocument,
  PasswordResetTokenSchema,
} from './infrastructure/database/mongodb/schemas/password-reset-token.schema';
import {
  ProductDocument,
  ProductSchema,
} from './infrastructure/database/mongodb/schemas/product.schema';
import {
  ProductTypeDocument,
  ProductTypeSchema,
} from './infrastructure/database/mongodb/schemas/product-type.schema';
import {
  RefreshSessionDocument,
  RefreshSessionSchema,
} from './infrastructure/database/mongodb/schemas/refresh-session.schema';
import {
  UserDocument,
  UserSchema,
} from './infrastructure/database/mongodb/schemas/user.schema';
import { LogMailSenderService } from './infrastructure/mail/log-mail-sender.service';
import { NestJwtSessionService } from './infrastructure/security/jwt-session.service';
import { Argon2PasswordHasherService } from './infrastructure/security/argon2-password-hasher.service';
import { Sha256TokenHasherService } from './infrastructure/security/sha256-token-hasher.service';
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
        JWT_ACCESS_SECRET: Joi.string().optional(),
        JWT_REFRESH_SECRET: Joi.string().optional(),
        JWT_ACCESS_TTL_SECONDS: Joi.number().integer().positive().default(900),
        JWT_REFRESH_TTL_SECONDS: Joi.number()
          .integer()
          .positive()
          .default(2592000),
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
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: ProductDocument.name, schema: ProductSchema },
      { name: ProductTypeDocument.name, schema: ProductTypeSchema },
      { name: InventoryLotDocument.name, schema: InventoryLotSchema },
      { name: UserDocument.name, schema: UserSchema },
      {
        name: PasswordCredentialDocument.name,
        schema: PasswordCredentialSchema,
      },
      { name: RefreshSessionDocument.name, schema: RefreshSessionSchema },
      {
        name: PasswordResetTokenDocument.name,
        schema: PasswordResetTokenSchema,
      },
      {
        name: LegacyAccountClaimDocument.name,
        schema: LegacyAccountClaimSchema,
      },
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
    AuthSessionService,
    RegisterUserUseCase,
    LoginUserUseCase,
    GetCurrentUserUseCase,
    RefreshAuthSessionUseCase,
    LogoutUserUseCase,
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
    ClaimImportedAccountUseCase,
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
    MongoPasswordCredentialDao,
    MongoRefreshSessionDao,
    MongoPasswordResetTokenDao,
    MongoLegacyAccountClaimDao,
    MongoProductRepository,
    MongoProductTypeRepository,
    MongoInventoryLotRepository,
    {
      provide: USER_DAO,
      useExisting: MongoUserDao,
    },
    {
      provide: PASSWORD_CREDENTIAL_DAO,
      useExisting: MongoPasswordCredentialDao,
    },
    {
      provide: REFRESH_SESSION_DAO,
      useExisting: MongoRefreshSessionDao,
    },
    {
      provide: PASSWORD_RESET_TOKEN_DAO,
      useExisting: MongoPasswordResetTokenDao,
    },
    {
      provide: LEGACY_ACCOUNT_CLAIM_DAO,
      useExisting: MongoLegacyAccountClaimDao,
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
      provide: PASSWORD_HASHER,
      useClass: Argon2PasswordHasherService,
    },
    {
      provide: TOKEN_HASHER,
      useClass: Sha256TokenHasherService,
    },
    {
      provide: JWT_SESSION_SERVICE,
      useClass: NestJwtSessionService,
    },
    {
      provide: MAIL_SENDER,
      useClass: LogMailSenderService,
    },
  ],
})
export class AppModule {}
