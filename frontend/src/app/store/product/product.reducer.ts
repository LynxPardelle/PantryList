import { createReducer, on } from '@ngrx/store';
import { ProductState, initialProductState } from './product.state';
import * as ProductActions from './product.actions';

export const productReducer = createReducer(
  initialProductState,

  // Load Products
  on(ProductActions.loadProducts, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(ProductActions.loadProductsSuccess, (state, { products }) => ({
    ...state,
    products,
    loading: false,
    error: null
  })),

  on(ProductActions.loadProductsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Create Product
  on(ProductActions.createProduct, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(ProductActions.createProductSuccess, (state, { product }) => ({
    ...state,
    products: [...state.products, product],
    loading: false,
    error: null
  })),

  on(ProductActions.createProductFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Update Product Quantity
  on(ProductActions.updateProductQuantity, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(ProductActions.updateProductQuantitySuccess, (state, { product }) => ({
    ...state,
    products: state.products.map(p => p.id === product.id ? product : p),
    selectedProduct: state.selectedProduct?.id === product.id ? product : state.selectedProduct,
    loading: false,
    error: null
  })),

  on(ProductActions.updateProductQuantityFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Select Product
  on(ProductActions.selectProduct, (state, { product }) => ({
    ...state,
    selectedProduct: product
  })),

  on(ProductActions.clearSelectedProduct, (state) => ({
    ...state,
    selectedProduct: null
  })),

  // Clear Error
  on(ProductActions.clearError, (state) => ({
    ...state,
    error: null
  }))
);
