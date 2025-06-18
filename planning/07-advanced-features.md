# 🚀 Paso 7: Características Avanzadas

## Objetivo

Implementar funcionalidades adicionales que mejoren la experiencia del usuario y añadan valor al MVP.

## Tareas

### 7.1 Categorización de Productos

```typescript
// src/modules/products/schemas/category.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  icon: string;

  @Prop({ required: true })
  color: string;

  @Prop()
  description: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

// src/modules/products/services/categories.service.ts
@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>
  ) {}

  async findAll(): Promise<Category[]> {
    return this.categoryModel.find({ isActive: true }).exec();
  }

  async createDefault(): Promise<void> {
    const defaultCategories = [
      { name: 'food', icon: 'restaurant', color: '#4CAF50', description: 'Productos alimenticios' },
      { name: 'cleaning', icon: 'cleaning_services', color: '#2196F3', description: 'Productos de limpieza' },
      { name: 'hygiene', icon: 'local_pharmacy', color: '#FF9800', description: 'Productos de higiene personal' },
      { name: 'healthcare', icon: 'health_and_safety', color: '#F44336', description: 'Productos de salud' },
      { name: 'other', icon: 'category', color: '#9C27B0', description: 'Otros productos' }
    ];

    for (const category of defaultCategories) {
      const exists = await this.categoryModel.findOne({ name: category.name });
      if (!exists) {
        await this.categoryModel.create(category);
      }
    }
  }
}
```

### 7.2 Historial de Compras y Análisis

```typescript
// src/modules/purchases/schemas/purchase.schema.ts
@Schema({ timestamps: true })
export class Purchase {
  @Prop({ required: true, ref: 'Product' })
  productId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  unit: string;

  @Prop({ required: true })
  purchaseDate: Date;

  @Prop()
  price: number;

  @Prop()
  store: string;

  @Prop()
  notes: string;
}

export const PurchaseSchema = SchemaFactory.createForClass(Purchase);

// src/modules/analytics/services/analytics.service.ts
@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Purchase.name) private purchaseModel: Model<PurchaseDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>
  ) {}

  async getSpendingAnalytics(userId: string, period: 'week' | 'month' | 'year'): Promise<any> {
    const startDate = this.getStartDate(period);
    
    const analytics = await this.purchaseModel.aggregate([
      {
        $match: {
          userId,
          purchaseDate: { $gte: startDate },
          price: { $exists: true }
        }
      },
      {
        $group: {
          _id: {
            category: '$category',
            month: { $month: '$purchaseDate' },
            year: { $year: '$purchaseDate' }
          },
          totalSpent: { $sum: '$price' },
          totalQuantity: { $sum: '$quantity' },
          purchases: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 }
      }
    ]);

    return analytics;
  }

  async getPredictiveAnalytics(userId: string): Promise<any> {
    const userProducts = await this.productModel.find({ userId });
    const predictions = [];

    for (const product of userProducts) {
      const purchaseHistory = await this.purchaseModel
        .find({ productId: product._id, userId })
        .sort({ purchaseDate: -1 })
        .limit(6);

      if (purchaseHistory.length >= 2) {
        const prediction = this.calculateConsumptionTrend(product, purchaseHistory);
        predictions.push({
          product: product.title,
          currentUsage: product.usageRate,
          predictedUsage: prediction.predictedUsage,
          accuracy: prediction.accuracy,
          recommendation: prediction.recommendation
        });
      }
    }

    return predictions;
  }

  private calculateConsumptionTrend(product: Product, history: Purchase[]): any {
    // Algoritmo simple de regresión lineal para predecir uso futuro
    const intervals = [];
    
    for (let i = 1; i < history.length; i++) {
      const daysDiff = Math.ceil(
        (history[i-1].purchaseDate.getTime() - history[i].purchaseDate.getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      const avgDailyConsumption = history[i].quantity / daysDiff;
      intervals.push(avgDailyConsumption);
    }

    const avgConsumption = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const currentDailyUsage = this.convertToDailyUsage(product.usageRate);
    
    const accuracy = Math.max(0, 100 - Math.abs((avgConsumption - currentDailyUsage) / currentDailyUsage * 100));
    
    return {
      predictedUsage: {
        amount: avgConsumption * 30, // Monthly prediction
        period: 'month'
      },
      accuracy: Math.round(accuracy),
      recommendation: this.getRecommendation(accuracy, avgConsumption, currentDailyUsage)
    };
  }

  private getRecommendation(accuracy: number, predicted: number, current: number): string {
    if (accuracy < 50) {
      return 'Necesitas más historial para predicciones precisas';
    }
    
    if (predicted > current * 1.2) {
      return 'Tu consumo está aumentando, considera comprar más cantidad';
    } else if (predicted < current * 0.8) {
      return 'Tu consumo está disminuyendo, puedes reducir la frecuencia de compra';
    } else {
      return 'Tu patrón de consumo es estable';
    }
  }

  private convertToDailyUsage(usageRate: { amount: number; period: string }): number {
    switch (usageRate.period) {
      case 'day': return usageRate.amount;
      case 'week': return usageRate.amount / 7;
      case 'month': return usageRate.amount / 30;
      case 'year': return usageRate.amount / 365;
      default: return usageRate.amount;
    }
  }

  private getStartDate(period: string): Date {
    const date = new Date();
    switch (period) {
      case 'week':
        date.setDate(date.getDate() - 7);
        break;
      case 'month':
        date.setMonth(date.getMonth() - 1);
        break;
      case 'year':
        date.setFullYear(date.getFullYear() - 1);
        break;
    }
    return date;
  }
}
```

### 7.3 Calendario y Vista de Programación

```typescript
// src/app/features/calendar/components/shopping-calendar/shopping-calendar.component.ts
import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface CalendarEvent {
  date: Date;
  products: Product[];
  urgency: 'high' | 'medium' | 'low';
}

@Component({
  selector: 'app-shopping-calendar',
  templateUrl: './shopping-calendar.component.html',
  styleUrls: ['./shopping-calendar.component.scss']
})
export class ShoppingCalendarComponent implements OnInit {
  calendarEvents$: Observable<CalendarEvent[]>;
  selectedDate: Date = new Date();
  viewMode: 'month' | 'week' = 'month';

  constructor(private store: Store<AppState>) {}

  ngOnInit(): void {
    this.store.dispatch(loadProducts());
    this.calendarEvents$ = this.buildCalendarEvents();
  }

  private buildCalendarEvents(): Observable<CalendarEvent[]> {
    return this.store.select(selectAllProducts).pipe(
      map(products => {
        const events: CalendarEvent[] = [];
        const groupedByDate = new Map<string, Product[]>();

        products.forEach(product => {
          if (product.nextPurchaseDate) {
            const dateKey = product.nextPurchaseDate.toDateString();
            if (!groupedByDate.has(dateKey)) {
              groupedByDate.set(dateKey, []);
            }
            groupedByDate.get(dateKey)!.push(product);
          }
        });

        groupedByDate.forEach((products, dateKey) => {
          const date = new Date(dateKey);
          const urgency = this.calculateUrgency(date);
          events.push({ date, products, urgency });
        });

        return events.sort((a, b) => a.date.getTime() - b.date.getTime());
      })
    );
  }

  private calculateUrgency(date: Date): 'high' | 'medium' | 'low' {
    const diffDays = Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) return 'high';
    if (diffDays <= 3) return 'medium';
    return 'low';
  }

  getEventsForDate(date: Date): Observable<CalendarEvent | undefined> {
    return this.calendarEvents$.pipe(
      map(events => events.find(event => 
        event.date.toDateString() === date.toDateString()
      ))
    );
  }

  generateShoppingList(date: Date): void {
    this.getEventsForDate(date).subscribe(event => {
      if (event) {
        this.store.dispatch(generateShoppingList({ 
          products: event.products.map(p => p.id),
          date 
        }));
      }
    });
  }
}
```

### 7.4 Lista de Compras Exportable

```typescript
// src/modules/shopping-lists/services/shopping-list.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class ShoppingListService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>
  ) {}

  async generateShoppingList(userId: string, date: Date): Promise<any> {
    const products = await this.productModel.find({
      userId,
      nextPurchaseDate: {
        $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
      }
    }).populate('category');

    const groupedByCategory = this.groupProductsByCategory(products);
    
    return {
      date,
      totalItems: products.length,
      categories: groupedByCategory,
      estimatedCost: this.calculateEstimatedCost(products)
    };
  }

  async exportToPDF(shoppingList: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('Lista de Compras PantryList', 50, 50);
      doc.fontSize(12).text(`Fecha: ${shoppingList.date.toLocaleDateString('es-ES')}`, 50, 80);
      doc.text(`Total de productos: ${shoppingList.totalItems}`, 50, 100);

      let yPosition = 140;

      // Categories and products
      Object.entries(shoppingList.categories).forEach(([category, products]: [string, any[]]) => {
        doc.fontSize(14).text(category.toUpperCase(), 50, yPosition);
        yPosition += 25;

        products.forEach(product => {
          doc.fontSize(10);
          doc.text(`• ${product.title}`, 70, yPosition);
          doc.text(`Cantidad necesaria: ${this.calculateNeededQuantity(product)} ${product.unit}`, 300, yPosition);
          yPosition += 20;

          if (yPosition > 700) {
            doc.addPage();
            yPosition = 50;
          }
        });

        yPosition += 10;
      });

      // Footer
      doc.fontSize(10).text('Generado por PantryList App', 50, yPosition + 20);

      doc.end();
    });
  }

  async exportToJSON(shoppingList: any): Promise<string> {
    return JSON.stringify(shoppingList, null, 2);
  }

  private groupProductsByCategory(products: Product[]): Record<string, Product[]> {
    return products.reduce((groups, product) => {
      const category = product.category || 'other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(product);
      return groups;
    }, {} as Record<string, Product[]>);
  }

  private calculateNeededQuantity(product: Product): number {
    // Calcular cantidad necesaria hasta la próxima compra programada
    const dailyUsage = this.convertToDailyUsage(product.usageRate);
    const daysUntilNext = 7; // Asumir compra semanal por defecto
    return Math.ceil(dailyUsage * daysUntilNext);
  }

  private calculateEstimatedCost(products: Product[]): number {
    // Placeholder - en una implementación real se podrían tener precios históricos
    return products.length * 10; // Estimación básica
  }

  private convertToDailyUsage(usageRate: { amount: number; period: string }): number {
    switch (usageRate.period) {
      case 'day': return usageRate.amount;
      case 'week': return usageRate.amount / 7;
      case 'month': return usageRate.amount / 30;
      case 'year': return usageRate.amount / 365;
      default: return usageRate.amount;
    }
  }
}
```

### 7.5 Notificaciones Push (Frontend)

```typescript
// src/app/core/services/notification.service.ts
import { Injectable } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly vapidPublicKey = environment.vapidPublicKey;

  constructor(
    private swPush: SwPush,
    private http: HttpClient
  ) {}

  requestPermission(): Observable<NotificationPermission> {
    return from(Notification.requestPermission());
  }

  subscribeToNotifications(): Observable<PushSubscription> {
    return this.swPush.requestSubscription({
      serverPublicKey: this.vapidPublicKey
    });
  }

  sendSubscriptionToServer(subscription: PushSubscription, userId: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/notifications/subscribe`, {
      subscription,
      userId
    });
  }

  scheduleLocalNotification(title: string, body: string, delay: number): void {
    if ('serviceWorker' in navigator && 'Notification' in window) {
      setTimeout(() => {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, {
            body,
            icon: '/assets/icons/icon-192x192.png',
            badge: '/assets/icons/badge-72x72.png',
            data: {
              url: '/',
              timestamp: Date.now()
            },
            actions: [
              {
                action: 'view',
                title: 'Ver productos'
              },
              {
                action: 'dismiss',
                title: 'Descartar'
              }
            ]
          });
        });
      }, delay);
    }
  }

  checkForDueProducts(): void {
    // Esta función se llamaría periódicamente para verificar productos próximos a agotarse
    this.http.get<Product[]>(`${environment.apiUrl}/products/due-soon`).subscribe(products => {
      if (products.length > 0) {
        const title = '🛒 Productos por agotar';
        const body = `Tienes ${products.length} productos que necesitan reposición pronto`;
        this.scheduleLocalNotification(title, body, 0);
      }
    });
  }
}
```

### 7.6 PWA Configuration

```json
// src/manifest.json
{
  "name": "PantryList - Gestión de Despensa",
  "short_name": "PantryList",
  "description": "Gestiona tu despensa de forma inteligente con auto-programación de compras",
  "theme_color": "#ff9800",
  "background_color": "#fafafa",
  "display": "standalone",
  "scope": "./",
  "start_url": "./",
  "icons": [
    {
      "src": "assets/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ]
}
```

## Checklist de Implementación

### Categorización
- [ ] Crear schema de categorías
- [ ] Implementar servicio de categorías
- [ ] Añadir categorías por defecto
- [ ] Integrar categorías en UI

### Analytics e Historial
- [ ] Crear schema de compras
- [ ] Implementar analytics service
- [ ] Crear algoritmos predictivos básicos
- [ ] Dashboard de analytics

### Calendario y Scheduling
- [ ] Componente de calendario
- [ ] Vista de eventos por fecha
- [ ] Generación de listas de compras
- [ ] Integración con productos

### Exportación
- [ ] Servicio de exportación PDF
- [ ] Exportación JSON
- [ ] Cálculo de cantidades necesarias
- [ ] Agrupación por categorías

### PWA y Notificaciones
- [ ] Configurar PWA manifest
- [ ] Implementar service worker
- [ ] Sistema de notificaciones push
- [ ] Notificaciones locales programadas
- [ ] Iconografía y branding

## Entregables

- ✅ Sistema de categorías funcionando
- ✅ Analytics básicos implementados
- ✅ Calendario de compras creado
- ✅ Exportación de listas funcionando
- ✅ PWA configurada
- ✅ Notificaciones implementadas

## Tiempo estimado: 12-16 horas

## Siguiente paso: 08-docker-deployment.md
