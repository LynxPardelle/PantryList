import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product, CreateProductRequest, UpdateQuantityRequest } from '../../shared/models/product.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly baseUrl = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) {}

  getProductsByUser(userId: string): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.baseUrl}?userId=${userId}`);
  }

  createProduct(product: CreateProductRequest): Observable<Product> {
    return this.http.post<Product>(this.baseUrl, product);
  }

  updateProductQuantity(productId: string, quantity: UpdateQuantityRequest): Observable<Product> {
    return this.http.put<Product>(`${this.baseUrl}/${productId}/quantity`, quantity);
  }

  getProductById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/${id}`);
  }
}
