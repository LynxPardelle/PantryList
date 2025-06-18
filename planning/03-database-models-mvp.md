# 🗃️ Paso 3: Modelos de Base de Datos y MVP Core

## Objetivo

Diseñar e implementar los modelos de base de datos para el MVP y crear las funcionalidades básicas del sistema.

## Tareas

### 3.1 Esquemas MongoDB

```typescript
// src/modules/products/schemas/product.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, min: 0 })
  currentQuantity: number;

  @Prop({ required: true, enum: ['kg', 'g', 'lt', 'ml', 'pieces', 'boxes'] })
  unit: string;

  @Prop({
    type: {
      amount: { type: Number, required: true, min: 0 },
      period: { type: String, required: true, enum: ['day', 'week', 'month', 'year'] }
    },
    required: true
  })
  usageRate: {
    amount: number;
    period: string;
  };

  @Prop({ 
    required: true, 
    enum: ['food', 'cleaning', 'hygiene', 'healthcare', 'other'],
    default: 'other'
  })
  category: string;

  @Prop({ 
    required: true, 
    enum: ['available', 'low-stock', 'out-of-stock'],
    default: 'available'
  })
  status: string;

  @Prop()
  nextPurchaseDate: Date;

  @Prop({ default: Date.now })
  lastUpdated: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
```

### 3.2 Usuario Schema

```typescript
// src/modules/users/schemas/user.schema.ts
@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  username: string;

  @Prop()
  email: string;

  @Prop({ 
    type: {
      theme: { type: String, enum: ['light', 'dark'], default: 'light' },
      notifications: { type: Boolean, default: true },
      language: { type: String, default: 'es' }
    },
    default: {}
  })
  preferences: {
    theme: string;
    notifications: boolean;
    language: string;
  };

  @Prop({ default: Date.now })
  lastLogin: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
```

### 3.3 Historial de Uso Schema

```typescript
// src/modules/products/schemas/usage-history.schema.ts
@Schema({ timestamps: true })
export class UsageHistory {
  @Prop({ required: true, ref: 'Product' })
  productId: string;

  @Prop({ required: true })
  quantityUsed: number;

  @Prop({ required: true })
  usageDate: Date;

  @Prop()
  notes: string;
}

export const UsageHistorySchema = SchemaFactory.createForClass(UsageHistory);
```

### 3.4 Implementación del Adaptador MongoDB

```typescript
// src/infrastructure/database/mongodb/mongo-product.repository.ts
@Injectable()
export class MongoProductRepository implements ProductRepository {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>
  ) {}

  async save(product: Product): Promise<Product> {
    const existingProduct = await this.productModel.findById(product.id.toString());
    
    if (existingProduct) {
      return this.productModel.findByIdAndUpdate(
        product.id.toString(),
        this.mapDomainToDocument(product),
        { new: true }
      ).exec();
    } else {
      const createdProduct = new this.productModel(this.mapDomainToDocument(product));
      return createdProduct.save();
    }
  }

  async findById(id: ProductId): Promise<Product | null> {
    const document = await this.productModel.findById(id.toString()).exec();
    return document ? this.mapDocumentToDomain(document) : null;
  }

  async findByUserId(userId: string): Promise<Product[]> {
    return this.productModel.find({ userId }).exec();
  }

  async findByCategory(category: string): Promise<Product[]> {
    return this.productModel.find({ category }).exec();
  }

  async findByStatus(status: string): Promise<Product[]> {
    return this.productModel.find({ status }).exec();
  }

  async update(id: string, updateData: Partial<Product>): Promise<Product | null> {
    return this.productModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.productModel.findByIdAndDelete(id).exec();
    return !!result;
  }
}
```

### 3.5 Algoritmo de Auto-Scheduling (MVP)

```typescript
// src/modules/scheduling/services/scheduling.service.ts
@Injectable()
export class SchedulingService {
  calculateNextPurchaseDate(product: Product): Date {
    const { currentQuantity, usageRate } = product;
    
    // Convertir uso a días
    const dailyUsage = this.convertToDailyUsage(usageRate);
    
    // Calcular días restantes
    const daysRemaining = Math.floor(currentQuantity / dailyUsage);
    
    // Agregar buffer de seguridad (comprar cuando quede 20% del stock)
    const safetyDays = Math.floor(daysRemaining * 0.8);
    
    // Calcular fecha
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + safetyDays);
    
    return nextDate;
  }

  private convertToDailyUsage(usageRate: { amount: number; period: string }): number {
    const { amount, period } = usageRate;
    
    switch (period) {
      case 'day':
        return amount;
      case 'week':
        return amount / 7;
      case 'month':
        return amount / 30;
      case 'year':
        return amount / 365;
      default:
        throw new Error(`Período no soportado: ${period}`);
    }
  }

  updateProductStatus(product: Product): string {
    const daysUntilPurchase = this.getDaysUntilPurchase(product.nextPurchaseDate);
    
    if (daysUntilPurchase <= 0) {
      return 'out-of-stock';
    } else if (daysUntilPurchase <= 3) {
      return 'low-stock';
    } else {
      return 'available';
    }
  }

  private getDaysUntilPurchase(nextPurchaseDate: Date): number {
    const today = new Date();
    const diffTime = nextPurchaseDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
```

### 3.6 Controllers MVP

```typescript
// src/modules/products/controllers/products.controller.ts
@Controller('products')
@ApiTags('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly schedulingService: SchedulingService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo producto' })
  async create(@Body() createProductDto: CreateProductDto): Promise<Product> {
    const product = await this.productsService.create(createProductDto);
    
    // Calcular fecha de próxima compra
    product.nextPurchaseDate = this.schedulingService.calculateNextPurchaseDate(product);
    product.status = this.schedulingService.updateProductStatus(product);
    
    return this.productsService.update(product.id, product);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener productos del usuario' })
  async findUserProducts(@Query('userId') userId: string): Promise<Product[]> {
    return this.productsService.findByUserId(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener producto por ID' })
  async findOne(@Param('id') id: string): Promise<Product> {
    return this.productsService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar producto' })
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto
  ): Promise<Product> {
    const updatedProduct = await this.productsService.update(id, updateProductDto);
    
    // Recalcular scheduling si cambió cantidad o uso
    if (updateProductDto.currentQuantity || updateProductDto.usageRate) {
      updatedProduct.nextPurchaseDate = this.schedulingService.calculateNextPurchaseDate(updatedProduct);
      updatedProduct.status = this.schedulingService.updateProductStatus(updatedProduct);
      
      return this.productsService.update(id, updatedProduct);
    }
    
    return updatedProduct;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar producto' })
  async remove(@Param('id') id: string): Promise<{ deleted: boolean }> {
    const deleted = await this.productsService.delete(id);
    return { deleted };
  }
}
```

## Checklist de Implementación

- [ ] Crear esquemas MongoDB para Product, User, UsageHistory
- [ ] Implementar adaptadores de repositorio MongoDB
- [ ] Crear algoritmo básico de scheduling en servicios de dominio
- [ ] Implementar casos de uso de aplicación
- [ ] Crear controllers HTTP en infraestructura
- [ ] Configurar validaciones con DTOs
- [ ] Setup de Swagger documentation
- [ ] Agregar tests unitarios básicos
- [ ] Configurar mapeo entre entidades de dominio y documentos de BD

## Entregables

- ✅ Modelos de base de datos implementados
- ✅ Adaptadores MongoDB funcionando
- ✅ Algoritmo de auto-scheduling básico
- ✅ API endpoints MVP creados
- ✅ Documentación Swagger
- ✅ Mapeo dominio-infraestructura implementado

## Tiempo estimado: 8-10 horas

## Siguiente paso: 04-frontend-mvp-components.md
