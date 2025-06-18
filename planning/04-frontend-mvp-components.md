# 🎨 Paso 4: Componentes Frontend MVP

## Objetivo

Desarrollar los componentes esenciales del frontend para el MVP con Angular Material, Bootstrap y ngx-bootstrap.

## Tareas

### 4.1 Configuración de NGX-Bootstrap y Tema

```typescript
// src/app/app.module.ts
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { TooltipModule } from 'ngx-bootstrap/tooltip';
import { ModalModule } from 'ngx-bootstrap/modal';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { AlertModule } from 'ngx-bootstrap/alert';
import { CollapseModule } from 'ngx-bootstrap/collapse';
import { ProgressbarModule } from 'ngx-bootstrap/progressbar';

@NgModule({
  imports: [
    // ... otros imports
    BsDropdownModule.forRoot(),
    TooltipModule.forRoot(),
    ModalModule.forRoot(),
    BsDatepickerModule.forRoot(),
    AlertModule.forRoot(),
    CollapseModule.forRoot(),
    ProgressbarModule.forRoot()
  ],
  // ...
})
export class AppModule { }
```

### 4.2 Configuración de Tema y Estilos

```scss
// src/styles.scss
@use '@angular/material' as mat;
@import '~bootstrap/dist/css/bootstrap.min.css';

// Paleta de colores cálida
$warm-primary: (
  50: #fff3e0,
  100: #ffe0b2,
  200: #ffcc80,
  300: #ffb74d,
  400: #ffa726,
  500: #ff9800,
  600: #fb8c00,
  700: #f57c00,
  800: #ef6c00,
  900: #e65100,
  contrast: (
    50: rgba(black, 0.87),
    100: rgba(black, 0.87),
    200: rgba(black, 0.87),
    300: rgba(black, 0.87),
    400: rgba(black, 0.87),
    500: white,
    600: white,
    700: white,
    800: white,
    900: white,
  )
);

$warm-accent: (
  50: #f3e5f5,
  100: #e1bee7,
  200: #ce93d8,
  300: #ba68c8,
  400: #ab47bc,
  500: #9c27b0,
  600: #8e24aa,
  700: #7b1fa2,
  800: #6a1b9a,
  900: #4a148c,
  contrast: (
    50: rgba(black, 0.87),
    100: rgba(black, 0.87),
    200: rgba(black, 0.87),
    300: white,
    400: white,
    500: white,
    600: white,
    700: white,
    800: white,
    900: white,
  )
);

$primary: mat.define-palette($warm-primary);
$accent: mat.define-palette($warm-accent);
$warn: mat.define-palette(mat.$red-palette);

$theme: mat.define-light-theme((
  color: (
    primary: $primary,
    accent: $accent,
    warn: $warn,
  ),
  typography: mat.define-typography-config(),
  density: 0,
));

@include mat.all-component-themes($theme);

// Variables globales
:root {
  --primary-color: #ff9800;
  --accent-color: #9c27b0;
  --background-warm: #fafafa;
  --text-primary: #424242;
  --text-secondary: #757575;
  --border-color: #e0e0e0;
  --success-color: #4caf50;
  --warning-color: #ff9800;
  --danger-color: #f44336;
}

body {
  font-family: 'Roboto', sans-serif;
  background-color: var(--background-warm);
  color: var(--text-primary);
}
```

### 4.2 Componente Login

```typescript
// src/app/features/auth/components/login/login.component.ts
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private store: Store<AppState>,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]]
    });
  }

  onLogin(): void {
    if (this.loginForm.valid) {
      const username = this.loginForm.get('username')?.value;
      this.store.dispatch(login({ username }));
      this.router.navigate(['/dashboard']);
    }
  }
}
```

```html
<!-- src/app/features/auth/components/login/login.component.html -->
<div class="login-container">
  <mat-card class="login-card">
    <mat-card-header>
      <mat-card-title>
        <mat-icon class="home-icon">home</mat-icon>
        Bienvenido a PantryList
      </mat-card-title>
      <mat-card-subtitle>Gestiona tu despensa de forma inteligente</mat-card-subtitle>
    </mat-card-header>

    <mat-card-content>
      <form [formGroup]="loginForm" (ngSubmit)="onLogin()">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre de usuario</mat-label>
          <input matInput formControlName="username" placeholder="Ingresa tu nombre">
          <mat-icon matSuffix>person</mat-icon>
          <mat-error *ngIf="loginForm.get('username')?.hasError('required')">
            El nombre de usuario es requerido
          </mat-error>
          <mat-error *ngIf="loginForm.get('username')?.hasError('minlength')">
            Mínimo 3 caracteres
          </mat-error>
        </mat-form-field>

        <button 
          mat-raised-button 
          color="primary" 
          type="submit"
          class="login-button"
          [disabled]="!loginForm.valid">
          <mat-icon>login</mat-icon>
          Ingresar
        </button>
      </form>
    </mat-card-content>
  </mat-card>
</div>
```

### 4.3 Componente Lista de Productos

```typescript
// src/app/features/products/components/product-list/product-list.component.ts
@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss']
})
export class ProductListComponent implements OnInit {
  products$ = this.store.select(selectAllProducts);
  loading$ = this.store.select(selectProductsLoading);

  displayedColumns: string[] = ['title', 'quantity', 'status', 'nextPurchase', 'actions'];

  constructor(
    private store: Store<AppState>,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.store.dispatch(loadProducts());
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'available': return 'check_circle';
      case 'low-stock': return 'warning';
      case 'out-of-stock': return 'error';
      default: return 'help';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'available': return 'primary';
      case 'low-stock': return 'accent';
      case 'out-of-stock': return 'warn';
      default: return '';
    }
  }

  openProductDialog(product?: Product): void {
    const dialogRef = this.dialog.open(ProductDialogComponent, {
      width: '500px',
      data: product || null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (product) {
          this.store.dispatch(updateProduct({ id: product.id, product: result }));
        } else {
          this.store.dispatch(createProduct({ product: result }));
        }
      }
    });
  }

  deleteProduct(product: Product): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirmar eliminación',
        message: `¿Estás seguro de que quieres eliminar "${product.title}"?`
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.store.dispatch(deleteProduct({ id: product.id }));
      }
    });
  }

  formatNextPurchase(date: Date): string {
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return 'Comprar ahora';
    } else if (diffDays === 0) {
      return 'Hoy';
    } else if (diffDays === 1) {
      return 'Mañana';
    } else if (diffDays <= 7) {
      return `En ${diffDays} días`;
    } else {
      return date.toLocaleDateString('es-ES');
    }
  }
}
```

```html
<!-- src/app/features/products/components/product-list/product-list.component.html -->
<div class="products-container">
  <div class="header-section">
    <h2>
      <mat-icon class="section-icon">inventory_2</mat-icon>
      Mis Productos
    </h2>
    <button 
      mat-fab 
      color="primary" 
      class="add-button"
      (click)="openProductDialog()"
      matTooltip="Agregar producto">
      <mat-icon>add</mat-icon>
    </button>
  </div>

  <mat-card class="products-card">
    <div *ngIf="loading$ | async" class="loading-container">
      <mat-spinner diameter="50"></mat-spinner>
      <p>Cargando productos...</p>
    </div>

    <mat-table [dataSource]="products$ | async" *ngIf="!(loading$ | async)">
      <!-- Columna Título -->
      <ng-container matColumnDef="title">
        <mat-header-cell *matHeaderCellDef>Producto</mat-header-cell>
        <mat-cell *matCellDef="let product">
          <div class="product-info">
            <mat-icon class="category-icon">{{ getCategoryIcon(product.category) }}</mat-icon>
            <div>
              <strong>{{ product.title }}</strong>
              <br>
              <small class="category-text">{{ product.category | titlecase }}</small>
            </div>
          </div>
        </mat-cell>
      </ng-container>

      <!-- Columna Cantidad -->
      <ng-container matColumnDef="quantity">
        <mat-header-cell *matHeaderCellDef>Cantidad</mat-header-cell>
        <mat-cell *matCellDef="let product">
          <div class="quantity-info">
            <span class="quantity">{{ product.currentQuantity }} {{ product.unit }}</span>
            <br>
            <small class="usage">Uso: {{ product.usageRate.amount }} {{ product.unit }}/{{ product.usageRate.period }}</small>
          </div>
        </mat-cell>
      </ng-container>

      <!-- Columna Estado -->
      <ng-container matColumnDef="status">
        <mat-header-cell *matHeaderCellDef>Estado</mat-header-cell>
        <mat-cell *matCellDef="let product">
          <mat-chip 
            [color]="getStatusColor(product.status)"
            selected>
            <mat-icon matChipAvatar>{{ getStatusIcon(product.status) }}</mat-icon>
            {{ getStatusText(product.status) }}
          </mat-chip>
        </mat-cell>
      </ng-container>

      <!-- Columna Próxima Compra -->
      <ng-container matColumnDef="nextPurchase">
        <mat-header-cell *matHeaderCellDef>Próxima Compra</mat-header-cell>
        <mat-cell *matCellDef="let product">
          <div class="next-purchase">
            <mat-icon class="calendar-icon">event</mat-icon>
            <span [class.urgent]="isUrgent(product.nextPurchaseDate)">
              {{ formatNextPurchase(product.nextPurchaseDate) }}
            </span>
          </div>
        </mat-cell>
      </ng-container>

      <!-- Columna Acciones -->
      <ng-container matColumnDef="actions">
        <mat-header-cell *matHeaderCellDef>Acciones</mat-header-cell>
        <mat-cell *matCellDef="let product">
          <button 
            mat-icon-button 
            color="primary"
            (click)="openProductDialog(product)"
            matTooltip="Editar">
            <mat-icon>edit</mat-icon>
          </button>
          <button 
            mat-icon-button 
            color="warn"
            (click)="deleteProduct(product)"
            matTooltip="Eliminar">
            <mat-icon>delete</mat-icon>
          </button>
        </mat-cell>
      </ng-container>

      <mat-header-row *matHeaderRowDef="displayedColumns"></mat-header-row>
      <mat-row *matRowDef="let row; columns: displayedColumns;"></mat-row>
    </mat-table>

    <!-- Estado vacío -->
    <div *ngIf="(products$ | async)?.length === 0 && !(loading$ | async)" class="empty-state">
      <mat-icon class="empty-icon">inventory_2</mat-icon>
      <h3>No hay productos registrados</h3>
      <p>Agrega tu primer producto para comenzar a gestionar tu despensa</p>
      <button 
        mat-raised-button 
        color="primary"
        (click)="openProductDialog()">
        <mat-icon>add</mat-icon>
        Agregar primer producto
      </button>
    </div>
  </mat-card>
</div>
```

### 4.4 Componente Formulario de Producto

```typescript
// src/app/features/products/components/product-dialog/product-dialog.component.ts
@Component({
  selector: 'app-product-dialog',
  templateUrl: './product-dialog.component.html',
  styleUrls: ['./product-dialog.component.scss']
})
export class ProductDialogComponent implements OnInit {
  productForm: FormGroup;
  isEdit: boolean;
  
  categories = [
    { value: 'food', label: 'Comida', icon: 'restaurant' },
    { value: 'cleaning', label: 'Limpieza', icon: 'cleaning_services' },
    { value: 'hygiene', label: 'Higiene', icon: 'local_pharmacy' },
    { value: 'healthcare', label: 'Salud', icon: 'health_and_safety' },
    { value: 'other', label: 'Otro', icon: 'category' }
  ];

  units = [
    { value: 'kg', label: 'Kilogramos' },
    { value: 'g', label: 'Gramos' },
    { value: 'lt', label: 'Litros' },
    { value: 'ml', label: 'Mililitros' },
    { value: 'pieces', label: 'Piezas' },
    { value: 'boxes', label: 'Cajas' }
  ];

  periods = [
    { value: 'day', label: 'Día' },
    { value: 'week', label: 'Semana' },
    { value: 'month', label: 'Mes' },
    { value: 'year', label: 'Año' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ProductDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Product | null
  ) {
    this.isEdit = !!data;
    this.initForm();
  }

  ngOnInit(): void {
    if (this.data) {
      this.productForm.patchValue({
        title: this.data.title,
        currentQuantity: this.data.currentQuantity,
        unit: this.data.unit,
        category: this.data.category,
        usageAmount: this.data.usageRate.amount,
        usagePeriod: this.data.usageRate.period
      });
    }
  }

  private initForm(): void {
    this.productForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(2)]],
      currentQuantity: ['', [Validators.required, Validators.min(0)]],
      unit: ['', Validators.required],
      category: ['', Validators.required],
      usageAmount: ['', [Validators.required, Validators.min(0.1)]],
      usagePeriod: ['', Validators.required]
    });
  }

  onSave(): void {
    if (this.productForm.valid) {
      const formValue = this.productForm.value;
      
      const product: Partial<Product> = {
        title: formValue.title,
        currentQuantity: formValue.currentQuantity,
        unit: formValue.unit,
        category: formValue.category,
        usageRate: {
          amount: formValue.usageAmount,
          period: formValue.usagePeriod
        }
      };

      this.dialogRef.close(product);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
```

### 4.5 Dashboard Component

```typescript
// src/app/features/dashboard/dashboard.component.ts
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  products$ = this.store.select(selectAllProducts);
  
  constructor(private store: Store<AppState>) {}

  ngOnInit(): void {
    this.store.dispatch(loadProducts());
  }

  get urgentProducts$() {
    return this.products$.pipe(
      map(products => products.filter(p => this.isUrgent(p.nextPurchaseDate)))
    );
  }

  get lowStockProducts$() {
    return this.products$.pipe(
      map(products => products.filter(p => p.status === 'low-stock'))
    );
  }

  private isUrgent(date: Date): boolean {
    const diffDays = Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 2;
  }
}
```

## Checklist de Implementación

- [ ] Configurar tema Angular Material con colores cálidos
- [ ] Crear componente de login simple
- [ ] Implementar lista de productos con Material Table
- [ ] Crear formulario de producto con validaciones
- [ ] Implementar dashboard con resumen
- [ ] Agregar iconografía relacionada con hogar
- [ ] Configurar routing entre componentes
- [ ] Implementar responsive design
- [ ] Agregar loading states y error handling

## Entregables

- ✅ Tema cálido configurado
- ✅ Componentes MVP implementados
- ✅ Formularios con validaciones
- ✅ Dashboard funcional
- ✅ Diseño responsive

## Tiempo estimado: 10-12 horas

## Siguiente paso: 05-testing-mvp.md
