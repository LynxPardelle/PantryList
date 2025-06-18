# 🧪 Paso 5: Testing MVP - Frontend y Backend

## Objetivo

Implementar tests unitarios básicos para cumplir con los requisitos mínimos del proyecto, tanto en frontend como backend.

## Tareas

### 5.1 Tests Backend (NestJS + Jest)

#### Test del Servicio de Productos

```typescript
// src/modules/products/services/products.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ProductsService } from './products.service';
import { Product } from '../schemas/product.schema';

describe('ProductsService', () => {
  let service: ProductsService;
  let mockProductModel: any;

  const mockProduct = {
    _id: 'mockId',
    userId: 'user1',
    title: 'Aceite de Oliva',
    currentQuantity: 1,
    unit: 'lt',
    usageRate: { amount: 2, period: 'month' },
    category: 'food',
    status: 'available',
    nextPurchaseDate: new Date('2024-01-15'),
    save: jest.fn().mockResolvedValue(this),
    toObject: jest.fn().mockReturnValue(this)
  };

  beforeEach(async () => {
    mockProductModel = {
      new: jest.fn().mockResolvedValue(mockProduct),
      constructor: jest.fn().mockResolvedValue(mockProduct),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      create: jest.fn(),
      exec: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getModelToken(Product.name),
          useValue: mockProductModel
        }
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new product', async () => {
      const createProductDto = {
        userId: 'user1',
        title: 'Aceite de Oliva',
        currentQuantity: 1,
        unit: 'lt',
        usageRate: { amount: 2, period: 'month' },
        category: 'food'
      };

      mockProductModel.create.mockResolvedValue(mockProduct);

      const result = await service.create(createProductDto);

      expect(mockProductModel.create).toHaveBeenCalledWith(createProductDto);
      expect(result).toEqual(mockProduct);
    });

    it('should throw error when required fields are missing', async () => {
      const invalidDto = {
        title: 'Producto sin userId'
      };

      mockProductModel.create.mockRejectedValue(new Error('Validation failed'));

      await expect(service.create(invalidDto as any)).rejects.toThrow('Validation failed');
    });
  });

  describe('findByUserId', () => {
    it('should return products for a specific user', async () => {
      const userId = 'user1';
      const mockProducts = [mockProduct];

      mockProductModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockProducts)
      });

      const result = await service.findByUserId(userId);

      expect(mockProductModel.find).toHaveBeenCalledWith({ userId });
      expect(result).toEqual(mockProducts);
    });

    it('should return empty array when user has no products', async () => {
      const userId = 'userWithoutProducts';

      mockProductModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([])
      });

      const result = await service.findByUserId(userId);

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update a product successfully', async () => {
      const productId = 'mockId';
      const updateData = { currentQuantity: 0.5 };
      const updatedProduct = { ...mockProduct, ...updateData };

      mockProductModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedProduct)
      });

      const result = await service.update(productId, updateData);

      expect(mockProductModel.findByIdAndUpdate).toHaveBeenCalledWith(
        productId, 
        updateData, 
        { new: true }
      );
      expect(result).toEqual(updatedProduct);
    });
  });
});
```

#### Test del Servicio de Scheduling

```typescript
// src/modules/scheduling/services/scheduling.service.spec.ts
import { SchedulingService } from './scheduling.service';
import { Product } from '../../products/schemas/product.schema';

describe('SchedulingService', () => {
  let service: SchedulingService;

  beforeEach(() => {
    service = new SchedulingService();
  });

  describe('calculateNextPurchaseDate', () => {
    it('should calculate correct next purchase date for monthly usage', () => {
      const product: Partial<Product> = {
        currentQuantity: 1,
        usageRate: { amount: 2, period: 'month' }
      };

      const result = service.calculateNextPurchaseDate(product as Product);
      
      // Con 1lt disponible y uso de 2lt/mes, debería durar ~15 días
      // Con buffer de 80%, debería comprar en ~12 días
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 12);

      expect(result.toDateString()).toBe(expectedDate.toDateString());
    });

    it('should calculate correct next purchase date for weekly usage', () => {
      const product: Partial<Product> = {
        currentQuantity: 500, // 500g
        usageRate: { amount: 1000, period: 'week' } // 1kg por semana
      };

      const result = service.calculateNextPurchaseDate(product as Product);
      
      // Con 500g disponible y uso de 1000g/semana, debería durar ~3.5 días
      // Con buffer de 80%, debería comprar en ~2-3 días
      const today = new Date();
      const diffDays = Math.ceil((result.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      expect(diffDays).toBeGreaterThanOrEqual(2);
      expect(diffDays).toBeLessThanOrEqual(3);
    });

    it('should handle edge case when current quantity is 0', () => {
      const product: Partial<Product> = {
        currentQuantity: 0,
        usageRate: { amount: 1, period: 'day' }
      };

      const result = service.calculateNextPurchaseDate(product as Product);
      
      // Si no hay cantidad, debería indicar compra inmediata
      const today = new Date();
      expect(result.getTime()).toBeLessThanOrEqual(today.getTime());
    });
  });

  describe('updateProductStatus', () => {
    it('should return "out-of-stock" when next purchase date is past', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const product: Partial<Product> = {
        nextPurchaseDate: pastDate
      };

      const status = service.updateProductStatus(product as Product);
      expect(status).toBe('out-of-stock');
    });

    it('should return "low-stock" when next purchase is within 3 days', () => {
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 2);

      const product: Partial<Product> = {
        nextPurchaseDate: soonDate
      };

      const status = service.updateProductStatus(product as Product);
      expect(status).toBe('low-stock');
    });

    it('should return "available" when next purchase is more than 3 days away', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const product: Partial<Product> = {
        nextPurchaseDate: futureDate
      };

      const status = service.updateProductStatus(product as Product);
      expect(status).toBe('available');
    });
  });

  describe('convertToDailyUsage', () => {
    it('should convert weekly usage to daily', () => {
      const usageRate = { amount: 7, period: 'week' };
      const result = service['convertToDailyUsage'](usageRate);
      expect(result).toBe(1); // 7 por semana = 1 por día
    });

    it('should convert monthly usage to daily', () => {
      const usageRate = { amount: 30, period: 'month' };
      const result = service['convertToDailyUsage'](usageRate);
      expect(result).toBe(1); // 30 por mes = 1 por día
    });

    it('should handle daily usage as-is', () => {
      const usageRate = { amount: 2, period: 'day' };
      const result = service['convertToDailyUsage'](usageRate);
      expect(result).toBe(2);
    });

    it('should throw error for unsupported period', () => {
      const usageRate = { amount: 1, period: 'hour' };
      expect(() => service['convertToDailyUsage'](usageRate)).toThrow('Período no soportado: hour');
    });
  });
});
```

### 5.2 Tests Frontend (Angular + Jasmine/Karma)

#### Test del Componente Product List

```typescript
// src/app/features/products/components/product-list/product-list.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';

import { ProductListComponent } from './product-list.component';
import { Product } from '../../models/product.interface';
import { loadProducts, deleteProduct } from '../../store/products.actions';

describe('ProductListComponent', () => {
  let component: ProductListComponent;
  let fixture: ComponentFixture<ProductListComponent>;
  let mockStore: jasmine.SpyObj<Store>;
  let mockDialog: jasmine.SpyObj<MatDialog>;

  const mockProducts: Product[] = [
    {
      id: '1',
      userId: 'user1',
      title: 'Aceite de Oliva',
      currentQuantity: 1,
      unit: 'lt',
      usageRate: { amount: 2, period: 'month' },
      category: 'food',
      status: 'available',
      nextPurchaseDate: new Date('2024-01-15'),
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      userId: 'user1',
      title: 'Arroz',
      currentQuantity: 500,
      unit: 'g',
      usageRate: { amount: 1000, period: 'week' },
      category: 'food',
      status: 'low-stock',
      nextPurchaseDate: new Date('2024-01-02'),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  beforeEach(async () => {
    const storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      declarations: [ProductListComponent],
      providers: [
        { provide: Store, useValue: storeSpy },
        { provide: MatDialog, useValue: dialogSpy }
      ]
    }).compileComponents();

    mockStore = TestBed.inject(Store) as jasmine.SpyObj<Store>;
    mockDialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
    
    // Mock store selectors
    mockStore.select.and.returnValue(of(mockProducts));
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProductListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should dispatch loadProducts on init', () => {
    component.ngOnInit();
    expect(mockStore.dispatch).toHaveBeenCalledWith(loadProducts());
  });

  describe('getStatusIcon', () => {
    it('should return correct icon for available status', () => {
      const icon = component.getStatusIcon('available');
      expect(icon).toBe('check_circle');
    });

    it('should return correct icon for low-stock status', () => {
      const icon = component.getStatusIcon('low-stock');
      expect(icon).toBe('warning');
    });

    it('should return correct icon for out-of-stock status', () => {
      const icon = component.getStatusIcon('out-of-stock');
      expect(icon).toBe('error');
    });

    it('should return help icon for unknown status', () => {
      const icon = component.getStatusIcon('unknown');
      expect(icon).toBe('help');
    });
  });

  describe('getStatusColor', () => {
    it('should return correct color for each status', () => {
      expect(component.getStatusColor('available')).toBe('primary');
      expect(component.getStatusColor('low-stock')).toBe('accent');
      expect(component.getStatusColor('out-of-stock')).toBe('warn');
      expect(component.getStatusColor('unknown')).toBe('');
    });
  });

  describe('formatNextPurchase', () => {
    it('should return "Comprar ahora" for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      const result = component.formatNextPurchase(pastDate);
      expect(result).toBe('Comprar ahora');
    });

    it('should return "Hoy" for today', () => {
      const today = new Date();
      
      const result = component.formatNextPurchase(today);
      expect(result).toBe('Hoy');
    });

    it('should return "Mañana" for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const result = component.formatNextPurchase(tomorrow);
      expect(result).toBe('Mañana');
    });

    it('should return days count for dates within a week', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      
      const result = component.formatNextPurchase(futureDate);
      expect(result).toBe('En 3 días');
    });

    it('should return formatted date for dates beyond a week', () => {
      const futureDate = new Date('2024-12-25');
      
      const result = component.formatNextPurchase(futureDate);
      expect(result).toBe('25/12/2024');
    });
  });

  describe('deleteProduct', () => {
    it('should dispatch deleteProduct action when confirmed', () => {
      const product = mockProducts[0];
      const mockDialogRef = {
        afterClosed: () => of(true)
      };
      
      mockDialog.open.and.returnValue(mockDialogRef as any);
      
      component.deleteProduct(product);
      
      expect(mockDialog.open).toHaveBeenCalled();
      expect(mockStore.dispatch).toHaveBeenCalledWith(deleteProduct({ id: product.id }));
    });

    it('should not dispatch deleteProduct action when cancelled', () => {
      const product = mockProducts[0];
      const mockDialogRef = {
        afterClosed: () => of(false)
      };
      
      mockDialog.open.and.returnValue(mockDialogRef as any);
      mockStore.dispatch.calls.reset();
      
      component.deleteProduct(product);
      
      expect(mockDialog.open).toHaveBeenCalled();
      expect(mockStore.dispatch).not.toHaveBeenCalledWith(deleteProduct({ id: product.id }));
    });
  });
});
```

#### Test del Servicio de Productos (Frontend)

```typescript
// src/app/core/services/products.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { ProductsService } from './products.service';
import { Product } from '../../features/products/models/product.interface';
import { environment } from '../../../environments/environment';

describe('ProductsService', () => {
  let service: ProductsService;
  let httpMock: HttpTestingController;

  const mockProduct: Product = {
    id: '1',
    userId: 'user1',
    title: 'Test Product',
    currentQuantity: 1,
    unit: 'lt',
    usageRate: { amount: 2, period: 'month' },
    category: 'food',
    status: 'available',
    nextPurchaseDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProductsService]
    });
    
    service = TestBed.inject(ProductsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getProducts', () => {
    it('should return products list', () => {
      const mockProducts = [mockProduct];

      service.getProducts().subscribe(products => {
        expect(products).toEqual(mockProducts);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/products`);
      expect(req.request.method).toBe('GET');
      req.flush(mockProducts);
    });

    it('should handle error response', () => {
      service.getProducts().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(500);
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/products`);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('createProduct', () => {
    it('should create a new product', () => {
      const createDto = {
        title: 'New Product',
        currentQuantity: 1,
        unit: 'kg',
        usageRate: { amount: 1, period: 'week' },
        category: 'food'
      };

      service.createProduct(createDto).subscribe(product => {
        expect(product).toEqual(mockProduct);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/products`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createDto);
      req.flush(mockProduct);
    });
  });

  describe('updateProduct', () => {
    it('should update existing product', () => {
      const productId = '1';
      const updateDto = { currentQuantity: 2 };

      service.updateProduct(productId, updateDto).subscribe(product => {
        expect(product).toEqual({ ...mockProduct, ...updateDto });
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/products/${productId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateDto);
      req.flush({ ...mockProduct, ...updateDto });
    });
  });

  describe('deleteProduct', () => {
    it('should delete product', () => {
      const productId = '1';

      service.deleteProduct(productId).subscribe(response => {
        expect(response.deleted).toBe(true);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/products/${productId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ deleted: true });
    });
  });
});
```

### 5.3 Scripts de Testing

```json
// package.json (backend)
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": [
      "**/*.(t|j)s"
    ],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

```json
// package.json (frontend)
{
  "scripts": {
    "test": "ng test",
    "test:coverage": "ng test --code-coverage",
    "test:watch": "ng test --watch"
  }
}
```

## Checklist de Implementación

### Backend Tests
- [ ] Test del servicio de productos (create, findByUserId, update)
- [ ] Test del algoritmo de scheduling
- [ ] Test de conversión de períodos
- [ ] Test de actualización de status
- [ ] Test de casos edge (cantidad 0, fechas pasadas)
- [ ] Configurar coverage reporting

### Frontend Tests
- [ ] Test del componente ProductList
- [ ] Test del servicio HTTP de productos
- [ ] Test de formateo de fechas
- [ ] Test de iconos y colores por status
- [ ] Test de acciones de usuario (eliminar, editar)
- [ ] Mock de dependencias (Store, Dialog)

### Coverage
- [ ] Mínimo 70% de coverage en servicios críticos
- [ ] Tests de casos felices y edge cases
- [ ] Configurar CI para ejecutar tests automáticamente

## Entregables

- ✅ Tests unitarios backend implementados
- ✅ Tests unitarios frontend implementados
- ✅ Coverage reports configurados
- ✅ Scripts de testing en package.json
- ✅ Documentación de testing

## Tiempo estimado: 6-8 horas

## Siguiente paso: 06-security-validation.md
