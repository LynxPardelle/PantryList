# 🔐 Paso 6: Seguridad y Validación

## Objetivo

Implementar medidas de seguridad básicas y validación robusta de datos para proteger la aplicación.

## Tareas

### 6.1 Validación Backend con Class-Validator

```typescript
// src/modules/products/dto/create-product.dto.ts
import { 
  IsString, 
  IsNotEmpty, 
  IsNumber, 
  IsPositive, 
  IsIn, 
  ValidateNested, 
  IsOptional,
  MinLength,
  MaxLength
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class UsageRateDto {
  @ApiProperty({ description: 'Cantidad de uso', example: 2 })
  @IsNumber({}, { message: 'La cantidad debe ser un número' })
  @IsPositive({ message: 'La cantidad debe ser positiva' })
  amount: number;

  @ApiProperty({ 
    description: 'Período de uso',
    enum: ['day', 'week', 'month', 'year'],
    example: 'month'
  })
  @IsString()
  @IsIn(['day', 'week', 'month', 'year'], { 
    message: 'El período debe ser day, week, month o year' 
  })
  period: string;
}

export class CreateProductDto {
  @ApiProperty({ description: 'ID del usuario', example: 'user123' })
  @IsString({ message: 'El ID del usuario debe ser texto' })
  @IsNotEmpty({ message: 'El ID del usuario es requerido' })
  userId: string;

  @ApiProperty({ description: 'Nombre del producto', example: 'Aceite de Oliva' })
  @IsString({ message: 'El título debe ser texto' })
  @IsNotEmpty({ message: 'El título es requerido' })
  @MinLength(2, { message: 'El título debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El título no puede exceder 100 caracteres' })
  title: string;

  @ApiProperty({ description: 'Cantidad actual', example: 1 })
  @IsNumber({}, { message: 'La cantidad debe ser un número' })
  @IsPositive({ message: 'La cantidad debe ser positiva' })
  currentQuantity: number;

  @ApiProperty({ 
    description: 'Unidad de medida',
    enum: ['kg', 'g', 'lt', 'ml', 'pieces', 'boxes'],
    example: 'lt'
  })
  @IsString()
  @IsIn(['kg', 'g', 'lt', 'ml', 'pieces', 'boxes'], {
    message: 'La unidad debe ser kg, g, lt, ml, pieces o boxes'
  })
  unit: string;

  @ApiProperty({ description: 'Tasa de uso del producto' })
  @ValidateNested()
  @Type(() => UsageRateDto)
  usageRate: UsageRateDto;

  @ApiProperty({ 
    description: 'Categoría del producto',
    enum: ['food', 'cleaning', 'hygiene', 'healthcare', 'other'],
    example: 'food'
  })
  @IsString()
  @IsIn(['food', 'cleaning', 'hygiene', 'healthcare', 'other'], {
    message: 'La categoría debe ser food, cleaning, hygiene, healthcare u other'
  })
  category: string;

  @ApiProperty({ description: 'Notas adicionales', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Las notas no pueden exceder 500 caracteres' })
  notes?: string;
}
```

### 6.2 Sanitización y Transformación

```typescript
// src/common/pipes/sanitize.pipe.ts
import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { plainToClass, Transform } from 'class-transformer';
import DOMPurify from 'isomorphic-dompurify';

@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type === 'body' && value) {
      return this.sanitizeObject(value);
    }
    return value;
  }

  private sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return DOMPurify.sanitize(obj.trim());
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = this.sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    
    return obj;
  }
}

// Uso en el DTO
export class CreateProductDto {
  @Transform(({ value }) => DOMPurify.sanitize(value?.trim()))
  @IsString()
  @IsNotEmpty()
  title: string;

  @Transform(({ value }) => DOMPurify.sanitize(value?.trim()))
  @IsOptional()
  @IsString()
  notes?: string;
}
```

### 6.3 Configuración de Helmet y Seguridad

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración de seguridad con Helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        manifestSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // CORS configuration
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Elimina propiedades no definidas en el DTO
    forbidNonWhitelisted: true, // Lanza error si hay propiedades no permitidas
    transform: true, // Transforma automáticamente a los tipos del DTO
    disableErrorMessages: process.env.NODE_ENV === 'production',
    validationError: {
      target: false,
      value: false,
    },
  }));

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('PantryList API')
    .setDescription('API para gestión de productos del hogar')
    .setVersion('1.0')
    .addTag('products', 'Operaciones de productos')
    .addTag('users', 'Operaciones de usuarios')
    .addTag('scheduling', 'Auto-programación de compras')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT || 3000);
}

bootstrap();
```

### 6.4 Rate Limiting y Anti-Flood

```typescript
// src/common/guards/rate-limit.guard.ts
import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private store: RateLimitStore = {};
  private readonly defaultLimit = 100; // requests per window
  private readonly defaultWindow = 60000; // 1 minute in milliseconds

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = this.getClientIP(request);
    
    const limit = this.reflector.get<number>('rateLimit', context.getHandler()) || this.defaultLimit;
    const window = this.reflector.get<number>('rateLimitWindow', context.getHandler()) || this.defaultWindow;

    const now = Date.now();
    const key = `${ip}:${context.getClass().name}:${context.getHandler().name}`;

    if (!this.store[key] || now > this.store[key].resetTime) {
      this.store[key] = {
        count: 1,
        resetTime: now + window
      };
      return true;
    }

    this.store[key].count++;

    if (this.store[key].count > limit) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((this.store[key].resetTime - now) / 1000)
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return true;
  }

  private getClientIP(request: Request): string {
    return (
      request.headers['x-forwarded-for'] as string ||
      request.headers['x-real-ip'] as string ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }
}

// Decorador personalizado para rate limiting
export const RateLimit = (limit: number, windowMs: number = 60000) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflector.createDecorator<number>('rateLimit')(limit)(target, propertyKey, descriptor);
    Reflector.createDecorator<number>('rateLimitWindow')(windowMs)(target, propertyKey, descriptor);
  };
};
```

### 6.5 Validación Frontend con Reactive Forms

```typescript
// src/app/shared/validators/custom.validators.ts
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class CustomValidators {
  static positiveNumber(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (value !== null && (isNaN(value) || value <= 0)) {
        return { positiveNumber: { value } };
      }
      return null;
    };
  }

  static sanitizedString(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (value && typeof value === 'string') {
        // Verificar si contiene scripts maliciosos básicos
        const hasScript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(value);
        const hasOnEvent = /on\w+\s*=/gi.test(value);
        
        if (hasScript || hasOnEvent) {
          return { unsafeContent: { value } };
        }
      }
      return null;
    };
  }

  static allowedUnits(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const allowedUnits = ['kg', 'g', 'lt', 'ml', 'pieces', 'boxes'];
      const value = control.value;
      
      if (value && !allowedUnits.includes(value)) {
        return { invalidUnit: { value, allowedUnits } };
      }
      return null;
    };
  }

  static allowedPeriods(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const allowedPeriods = ['day', 'week', 'month', 'year'];
      const value = control.value;
      
      if (value && !allowedPeriods.includes(value)) {
        return { invalidPeriod: { value, allowedPeriods } };
      }
      return null;
    };
  }
}
```

### 6.6 Sanitización Frontend

```typescript
// src/app/core/services/sanitizer.service.ts
import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class SanitizerService {
  constructor(private domSanitizer: DomSanitizer) {}

  sanitizeText(text: string): string {
    if (!text) return '';
    
    // Eliminar scripts y eventos
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/on\w+\s*=\s*'[^']*'/gi, '')
      .replace(/javascript:/gi, '')
      .trim();
  }

  sanitizeHtml(html: string): SafeHtml {
    return this.domSanitizer.sanitize(1, html) || '';
  }

  sanitizeObject<T>(obj: T): T {
    if (typeof obj === 'string') {
      return this.sanitizeText(obj) as T;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item)) as T;
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized = {} as T;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = this.sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    
    return obj;
  }
}
```

### 6.7 Interceptor HTTP para Sanitización

```typescript
// src/app/core/interceptors/sanitize.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SanitizerService } from '../services/sanitizer.service';

@Injectable()
export class SanitizeInterceptor implements HttpInterceptor {
  constructor(private sanitizer: SanitizerService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
      const sanitizedBody = this.sanitizer.sanitizeObject(request.body);
      
      const sanitizedRequest = request.clone({
        body: sanitizedBody
      });
      
      return next.handle(sanitizedRequest);
    }
    
    return next.handle(request);
  }
}
```

### 6.8 Configuración de Seguridad Angular

```typescript
// src/app/app.module.ts
import { NgModule } from '@angular/core';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { SanitizeInterceptor } from './core/interceptors/sanitize.interceptor';

@NgModule({
  // ... otros imports
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: SanitizeInterceptor,
      multi: true
    },
    // ... otros providers
  ],
})
export class AppModule { }
```

## Checklist de Implementación

### Backend Security
- [ ] Implementar DTOs con validaciones robustas
- [ ] Configurar Helmet para headers de seguridad
- [ ] Añadir sanitización de entradas
- [ ] Implementar rate limiting básico
- [ ] Configurar CORS apropiadamente
- [ ] Validar y transformar datos automáticamente
- [ ] Documentar API con Swagger

### Frontend Security
- [ ] Crear validadores personalizados
- [ ] Implementar sanitización de datos
- [ ] Configurar interceptor HTTP
- [ ] Validar formularios reactivos
- [ ] Escapar contenido HTML en templates
- [ ] Implementar manejo de errores de validación

### Testing Security
- [ ] Tests para validaciones de DTOs
- [ ] Tests para sanitización
- [ ] Tests para rate limiting
- [ ] Tests para validadores personalizados

## Entregables

- ✅ Validación robusta implementada
- ✅ Sanitización de entradas configurada
- ✅ Headers de seguridad aplicados
- ✅ Rate limiting básico funcionando
- ✅ Validadores frontend creados
- ✅ Tests de seguridad implementados

## Tiempo estimado: 6-8 horas

## Siguiente paso: 07-advanced-features.md
