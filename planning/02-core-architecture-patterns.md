# 🏗️ Paso 2: Arquitectura Hexagonal y Patrones de Diseño

## Objetivo

Implementar la arquitectura hexagonal (puertos y adaptadores) en el backend y establecer la arquitectura core del frontend con NgRx.

## Tareas

### 2.1 Arquitectura Hexagonal - Dominio (Backend)

```typescript
// src/domain/entities/product.entity.ts
export class Product {
  private constructor(
    private readonly _id: ProductId,
    private readonly _userId: UserId,
    private _title: string,
    private _currentQuantity: number,
    private _unit: QuantityUnit,
    private _usageRate: UsageRate,
    private _category: ProductCategory,
    private _status: ProductStatus,
    private _nextPurchaseDate?: Date,
    private readonly _createdAt: Date = new Date(),
    private _updatedAt: Date = new Date()
  ) {}

  static create(
    userId: UserId,
    title: string,
    currentQuantity: number,
    unit: QuantityUnit,
    usageRate: UsageRate,
    category: ProductCategory
  ): Product {
    const id = ProductId.generate();
    return new Product(
      id,
      userId,
      title,
      currentQuantity,
      unit,
      usageRate,
      category,
      ProductStatus.AVAILABLE
    );
  }

  // Getters
  get id(): ProductId { return this._id; }
  get userId(): UserId { return this._userId; }
  get title(): string { return this._title; }
  get currentQuantity(): number { return this._currentQuantity; }
  get unit(): QuantityUnit { return this._unit; }
  get usageRate(): UsageRate { return this._usageRate; }
  get category(): ProductCategory { return this._category; }
  get status(): ProductStatus { return this._status; }
  get nextPurchaseDate(): Date | undefined { return this._nextPurchaseDate; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  // Métodos de dominio
  updateQuantity(newQuantity: number): void {
    if (newQuantity < 0) {
      throw new Error('Quantity cannot be negative');
    }
    this._currentQuantity = newQuantity;
    this._updatedAt = new Date();
  }

  calculateNextPurchaseDate(schedulingService: SchedulingService): void {
    this._nextPurchaseDate = schedulingService.calculateNextPurchaseDate(this);
    this._status = schedulingService.updateProductStatus(this);
    this._updatedAt = new Date();
  }

  updateUsageRate(newUsageRate: UsageRate): void {
    this._usageRate = newUsageRate;
    this._updatedAt = new Date();
  }
}

// src/domain/value-objects/product-id.ts
export class ProductId {
  constructor(private readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('ProductId cannot be empty');
    }
  }

  static generate(): ProductId {
    return new ProductId(crypto.randomUUID());
  }

  static fromString(id: string): ProductId {
    return new ProductId(id);
  }

  toString(): string {
    return this.value;
  }

  equals(other: ProductId): boolean {
    return this.value === other.value;
  }
}

// src/domain/value-objects/usage-rate.ts
export class UsageRate {
  constructor(
    private readonly amount: number,
    private readonly period: Period
  ) {
    if (amount <= 0) {
      throw new Error('Usage rate amount must be positive');
    }
  }

  get Amount(): number { return this.amount; }
  get Period(): Period { return this.period; }

  toDailyUsage(): number {
    switch (this.period) {
      case Period.DAY: return this.amount;
      case Period.WEEK: return this.amount / 7;
      case Period.MONTH: return this.amount / 30;
      case Period.YEAR: return this.amount / 365;
      default: throw new Error(`Unsupported period: ${this.period}`);
    }
  }
}

// src/domain/enums/period.enum.ts
export enum Period {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year'
}
```

### 2.2 Puertos de Salida - Repositorios (Backend)

```typescript
// src/domain/repositories/product.repository.ts
export interface ProductRepository {
  save(product: Product): Promise<Product>;
  findById(id: ProductId): Promise<Product | null>;
  findByUserId(userId: UserId): Promise<Product[]>;
  findByCategory(category: ProductCategory): Promise<Product[]>;
  findByStatus(status: ProductStatus): Promise<Product[]>;
  delete(id: ProductId): Promise<void>;
  findAll(filter?: ProductFilter): Promise<Product[]>;
}

// src/domain/repositories/user.repository.ts
export interface UserRepository {
  save(user: User): Promise<User>;
  findById(id: UserId): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  delete(id: UserId): Promise<void>;
}
```

### 2.3 Servicios de Dominio (Backend)

```typescript
// src/domain/services/scheduling.service.ts
export interface SchedulingService {
  calculateNextPurchaseDate(product: Product): Date;
  updateProductStatus(product: Product): ProductStatus;
  getDaysUntilPurchase(nextPurchaseDate: Date): number;
}

export class SchedulingDomainService implements SchedulingService {
  private readonly SAFETY_BUFFER = 0.8; // 20% buffer

  calculateNextPurchaseDate(product: Product): Date {
    const dailyUsage = product.usageRate.toDailyUsage();
    const daysRemaining = Math.floor(product.currentQuantity / dailyUsage);
    const safetyDays = Math.floor(daysRemaining * this.SAFETY_BUFFER);
    
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + safetyDays);
    
    return nextDate;
  }

  updateProductStatus(product: Product): ProductStatus {
    if (!product.nextPurchaseDate) {
      return ProductStatus.AVAILABLE;
    }

    const daysUntilPurchase = this.getDaysUntilPurchase(product.nextPurchaseDate);
    
    if (daysUntilPurchase <= 0) {
      return ProductStatus.OUT_OF_STOCK;
    } else if (daysUntilPurchase <= 3) {
      return ProductStatus.LOW_STOCK;
    } else {
      return ProductStatus.AVAILABLE;
    }
  }

  getDaysUntilPurchase(nextPurchaseDate: Date): number {
    const today = new Date();
    const diffTime = nextPurchaseDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
```

### 2.4 Casos de Uso - Capa de Aplicación (Backend)

```typescript
// src/application/use-cases/create-product.use-case.ts
export interface CreateProductCommand {
  userId: string;
  title: string;
  currentQuantity: number;
  unit: string;
  usageRate: {
    amount: number;
    period: string;
  };
  category: string;
}

@Injectable()
export class CreateProductUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly schedulingService: SchedulingService
  ) {}

  async execute(command: CreateProductCommand): Promise<Product> {
    // Validar y convertir datos de entrada
    const userId = UserId.fromString(command.userId);
    const usageRate = new UsageRate(
      command.usageRate.amount,
      Period[command.usageRate.period.toUpperCase() as keyof typeof Period]
    );
    const unit = QuantityUnit[command.unit.toUpperCase() as keyof typeof QuantityUnit];
    const category = ProductCategory[command.category.toUpperCase() as keyof typeof ProductCategory];

    // Crear entidad de dominio
    const product = Product.create(
      userId,
      command.title,
      command.currentQuantity,
      unit,
      usageRate,
      category
    );

    // Aplicar lógica de dominio
    product.calculateNextPurchaseDate(this.schedulingService);

    // Persistir
    return await this.productRepository.save(product);
  }
}

// src/application/use-cases/update-product-quantity.use-case.ts
@Injectable()
export class UpdateProductQuantityUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly schedulingService: SchedulingService
  ) {}

  async execute(productId: string, newQuantity: number): Promise<Product> {
    const id = ProductId.fromString(productId);
    const product = await this.productRepository.findById(id);
    
    if (!product) {
      throw new Error('Product not found');
    }

    // Aplicar lógica de dominio
    product.updateQuantity(newQuantity);
    product.calculateNextPurchaseDate(this.schedulingService);

    // Persistir cambios
    return await this.productRepository.save(product);
  }
}

// src/application/use-cases/get-products-by-user.use-case.ts
@Injectable()
export class GetProductsByUserUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(userId: string): Promise<Product[]> {
    const userIdVO = UserId.fromString(userId);
    return await this.productRepository.findByUserId(userIdVO);
  }
}
```

### 2.5 Adaptadores de Persistencia (Backend)

```typescript
// src/infrastructure/database/mappers/product.mapper.ts
export class ProductMapper {
  static toDomain(productDocument: ProductDocument): Product {
    return Product.fromPrimitives({
      id: productDocument._id.toString(),
      userId: productDocument.userId,
      title: productDocument.title,
      currentQuantity: productDocument.currentQuantity,
      unit: productDocument.unit,
      usageRate: productDocument.usageRate,
      category: productDocument.category,
      status: productDocument.status,
      nextPurchaseDate: productDocument.nextPurchaseDate,
      createdAt: productDocument.createdAt,
      updatedAt: productDocument.updatedAt
    });
  }

  static toPersistence(product: Product): Partial<ProductDocument> {
    return {
      _id: product.id.toString(),
      userId: product.userId.toString(),
      title: product.title,
      currentQuantity: product.currentQuantity,
      unit: product.unit,
      usageRate: {
        amount: product.usageRate.Amount,
        period: product.usageRate.Period
      },
      category: product.category,
      status: product.status,
      nextPurchaseDate: product.nextPurchaseDate,
      updatedAt: product.updatedAt
    };
  }
}

// src/infrastructure/database/repositories/mongo-product.repository.ts
@Injectable()
export class MongoProductRepository implements ProductRepository {
  constructor(
    @InjectModel(ProductSchema.name) 
    private productModel: Model<ProductDocument>
  ) {}

  async save(product: Product): Promise<Product> {
    const productDoc = ProductMapper.toPersistence(product);
    
    if (await this.productModel.findById(product.id.toString())) {
      const updated = await this.productModel
        .findByIdAndUpdate(product.id.toString(), productDoc, { new: true })
        .exec();
      return ProductMapper.toDomain(updated!);
    } else {
      const created = new this.productModel(productDoc);
      const saved = await created.save();
      return ProductMapper.toDomain(saved);
    }
  }

  async findById(id: ProductId): Promise<Product | null> {
    const productDoc = await this.productModel.findById(id.toString()).exec();
    return productDoc ? ProductMapper.toDomain(productDoc) : null;
  }

  async findByUserId(userId: UserId): Promise<Product[]> {
    const productDocs = await this.productModel
      .find({ userId: userId.toString() })
      .exec();
    return productDocs.map(ProductMapper.toDomain);
  }

  async findByCategory(category: ProductCategory): Promise<Product[]> {
    const productDocs = await this.productModel
      .find({ category })
      .exec();
    return productDocs.map(ProductMapper.toDomain);
  }

  async findByStatus(status: ProductStatus): Promise<Product[]> {
    const productDocs = await this.productModel
      .find({ status })
      .exec();
    return productDocs.map(ProductMapper.toDomain);
  }

  async delete(id: ProductId): Promise<void> {
    await this.productModel.findByIdAndDelete(id.toString()).exec();
  }

  async findAll(filter?: ProductFilter): Promise<Product[]> {
    const query = filter ? this.buildQuery(filter) : {};
    const productDocs = await this.productModel.find(query).exec();
    return productDocs.map(ProductMapper.toDomain);
  }

  private buildQuery(filter: ProductFilter): any {
    const query: any = {};
    if (filter.userId) query.userId = filter.userId;
    if (filter.category) query.category = filter.category;
    if (filter.status) query.status = filter.status;
    return query;
  }
}
```

### 2.6 Controladores HTTP - Adaptadores de Entrada (Backend)

```typescript
// src/infrastructure/http/controllers/products.controller.ts
@Controller('products')
@ApiTags('products')
export class ProductsController {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly updateProductQuantityUseCase: UpdateProductQuantityUseCase,
    private readonly getProductsByUserUseCase: GetProductsByUserUseCase
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo producto' })
  async create(@Body() createProductDto: CreateProductDto): Promise<ProductResponseDto> {
    const command: CreateProductCommand = {
      userId: createProductDto.userId,
      title: createProductDto.title,
      currentQuantity: createProductDto.currentQuantity,
      unit: createProductDto.unit,
      usageRate: createProductDto.usageRate,
      category: createProductDto.category
    };

    const product = await this.createProductUseCase.execute(command);
    return ProductMapper.toResponse(product);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener productos del usuario' })
  async findUserProducts(@Query('userId') userId: string): Promise<ProductResponseDto[]> {
    const products = await this.getProductsByUserUseCase.execute(userId);
    return products.map(ProductMapper.toResponse);
  }

  @Put(':id/quantity')
  @ApiOperation({ summary: 'Actualizar cantidad del producto' })
  async updateQuantity(
    @Param('id') id: string,
    @Body() updateQuantityDto: UpdateQuantityDto
  ): Promise<ProductResponseDto> {
    const product = await this.updateProductQuantityUseCase.execute(
      id, 
      updateQuantityDto.quantity
    );
    return ProductMapper.toResponse(product);
  }
}
```

## Checklist de Implementación

### Backend
- [ ] Crear entidades de dominio con value objects
- [ ] Definir puertos (interfaces de repositorio)
- [ ] Implementar adaptadores para MongoDB
- [ ] Crear casos de uso en la capa de aplicación
- [ ] Implementar servicios de dominio
- [ ] Configurar dependency injection para hexagonal
- [ ] Crear DTOs y controladores en infraestructura

### Frontend
- [ ] Setup NgRx store structure
- [ ] Crear actions, reducers, effects
- [ ] Implementar servicios HTTP
- [ ] Crear interfaces TypeScript
- [ ] Setup de interceptors HTTP
- [ ] Configurar error handling

## Entregables

- ✅ Arquitectura Hexagonal implementada
- ✅ Arquitectura NgRx configurada
- ✅ Entidades de dominio y value objects definidos
- ✅ Puertos y adaptadores creados
- ✅ Dependency injection configurado

## Tiempo estimado: 6-8 horas

## Siguiente paso: 03-database-models-mvp.md
