import { createAction, props } from '@ngrx/store';
import { Product, CreateProductRequest, UpdateQuantityRequest } from '../../shared/models/product.model';

// Load Products Actions
export const loadProducts = createAction(
  '[Product] Load Products',
  props<{ userId: string }>()
);

export const loadProductsSuccess = createAction(
  '[Product] Load Products Success',
  props<{ products: Product[] }>()
);

export const loadProductsFailure = createAction(
  '[Product] Load Products Failure',
  props<{ error: string }>()
);

// Create Product Actions
export const createProduct = createAction(
  '[Product] Create Product',
  props<{ product: CreateProductRequest }>()
);

export const createProductSuccess = createAction(
  '[Product] Create Product Success',
  props<{ product: Product }>()
);

export const createProductFailure = createAction(
  '[Product] Create Product Failure',
  props<{ error: string }>()
);

// Update Product Quantity Actions
export const updateProductQuantity = createAction(
  '[Product] Update Product Quantity',
  props<{ productId: string; quantity: UpdateQuantityRequest }>()
);

export const updateProductQuantitySuccess = createAction(
  '[Product] Update Product Quantity Success',
  props<{ product: Product }>()
);

export const updateProductQuantityFailure = createAction(
  '[Product] Update Product Quantity Failure',
  props<{ error: string }>()
);

// Select Product Actions
export const selectProduct = createAction(
  '[Product] Select Product',
  props<{ product: Product }>()
);

export const clearSelectedProduct = createAction(
  '[Product] Clear Selected Product'
);

// Clear Error Action
export const clearError = createAction(
  '[Product] Clear Error'
);
