import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ApiProduct,
  CreateProductRequest,
  Product,
  UpdateQuantityRequest,
} from '../../shared/models/product.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly baseUrl = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) {}

  getProducts(): Observable<Product[]> {
    return this.http
      .get<ApiProduct[]>(this.baseUrl)
      .pipe(map((products) => products.map((product) => this.normalizeProduct(product))));
  }

  createProduct(product: CreateProductRequest): Observable<Product> {
    return this.http
      .post<ApiProduct>(this.baseUrl, product)
      .pipe(map((createdProduct) => this.normalizeProduct(createdProduct)));
  }

  updateProductQuantity(productId: string, quantity: UpdateQuantityRequest): Observable<Product> {
    return this.http
      .put<ApiProduct>(`${this.baseUrl}/${productId}/quantity`, quantity)
      .pipe(map((product) => this.normalizeProduct(product)));
  }

  private normalizeProduct(product: ApiProduct): Product {
    return {
      ...product,
      createdAt: new Date(product.createdAt),
      updatedAt: new Date(product.updatedAt),
      nextPurchaseDate: product.nextPurchaseDate ? new Date(product.nextPurchaseDate) : null,
    };
  }
}
