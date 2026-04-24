import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ProductState } from './product.state';

export interface ProductSummary {
  total: number;
  lowStock: number;
  dueSoon: number;
}

export const selectProductState = createFeatureSelector<ProductState>('products');

export const selectAllProducts = createSelector(
  selectProductState,
  (state: ProductState) => state.products
);

export const selectProductsLoading = createSelector(
  selectProductState,
  (state: ProductState) => state.loading
);

export const selectProductsError = createSelector(
  selectProductState,
  (state: ProductState) => state.error
);

export const selectSelectedProduct = createSelector(
  selectProductState,
  (state: ProductState) => state.selectedProduct
);

export const selectProductsByStatus = (status: string) => createSelector(
  selectAllProducts,
  (products) => products.filter(product => product.status === status)
);

export const selectProductsByCategory = (category: string) => createSelector(
  selectAllProducts,
  (products) => products.filter(product => product.category === category)
);

export const selectLowStockProducts = createSelector(
  selectAllProducts,
  (products) => products.filter(product => 
    product.status === 'low_stock' || product.status === 'out_of_stock'
  )
);

export const selectProductsSortedByUpdatedAt = createSelector(
  selectAllProducts,
  (products) => [...products].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
);

export const selectProductsNeedingPurchase = createSelector(
  selectAllProducts,
  (products) => products.filter(product => {
    if (!product.nextPurchaseDate) return false;
    const today = new Date();
    const purchaseDate = new Date(product.nextPurchaseDate);
    return purchaseDate <= today;
  })
);

export const selectProductSummary = createSelector(
  selectAllProducts,
  selectLowStockProducts,
  selectProductsNeedingPurchase,
  (products, lowStockProducts, productsNeedingPurchase): ProductSummary => ({
    total: products.length,
    lowStock: lowStockProducts.length,
    dueSoon: productsNeedingPurchase.length,
  })
);
