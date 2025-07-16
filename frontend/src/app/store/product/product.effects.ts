import { Injectable, Inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { ProductService } from '../../core/services/product.service';
import * as ProductActions from './product.actions';

@Injectable()
export class ProductEffects {
  
  loadProducts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProductActions.loadProducts),
      switchMap(({ userId }) =>
        this.productService.getProductsByUser(userId).pipe(
          map((products: any) => ProductActions.loadProductsSuccess({ products })),
          catchError(error => of(ProductActions.loadProductsFailure({ error: error.message })))
        )
      )
    )
  );

  createProduct$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProductActions.createProduct),
      switchMap(({ product }) =>
        this.productService.createProduct(product).pipe(
          map((createdProduct: any) => ProductActions.createProductSuccess({ product: createdProduct })),
          catchError(error => of(ProductActions.createProductFailure({ error: error.message })))
        )
      )
    )
  );

  updateProductQuantity$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProductActions.updateProductQuantity),
      switchMap(({ productId, quantity }) =>
        this.productService.updateProductQuantity(productId, quantity).pipe(
          map((product: any) => ProductActions.updateProductQuantitySuccess({ product })),
          catchError(error => of(ProductActions.updateProductQuantityFailure({ error: error.message })))
        )
      )
    )
  );

  constructor(
    private actions$: Actions,
    private productService: ProductService
  ) {}
}
