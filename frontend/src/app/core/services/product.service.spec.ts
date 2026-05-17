import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ProductService } from './product.service';

describe('ProductService', () => {
  let service: ProductService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    service = TestBed.inject(ProductService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('sends credentials with protected product requests', () => {
    service.getProducts().subscribe((products) => {
      expect(products[0].nextPurchaseDate).toEqual(
        new Date('2026-05-20T00:00:00.000Z'),
      );
    });
    const listRequest = httpMock.expectOne(`${environment.apiUrl}/products`);
    expect(listRequest.request.withCredentials).toBeTrue();
    listRequest.flush([makeApiProduct()]);

    service
      .createProduct({
        title: 'Arroz',
        currentQuantity: 1,
        unit: 'kg',
        usageRate: { amount: 1, period: 'month' },
        category: 'food',
      })
      .subscribe();
    const createRequest = httpMock.expectOne(`${environment.apiUrl}/products`);
    expect(createRequest.request.withCredentials).toBeTrue();
    createRequest.flush(makeApiProduct());

    service.updateProductQuantity('product-1', { quantity: 2 }).subscribe();
    const updateRequest = httpMock.expectOne(
      `${environment.apiUrl}/products/product-1/quantity`,
    );
    expect(updateRequest.request.withCredentials).toBeTrue();
    updateRequest.flush(makeApiProduct({ currentQuantity: 2 }));
  });
});

function makeApiProduct(overrides = {}) {
  return {
    id: 'product-1',
    userId: 'user-1',
    title: 'Arroz',
    currentQuantity: 1,
    unit: 'kg',
    usageRate: { amount: 1, period: 'month' },
    category: 'food',
    status: 'available',
    nextPurchaseDate: '2026-05-20T00:00:00.000Z',
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}
