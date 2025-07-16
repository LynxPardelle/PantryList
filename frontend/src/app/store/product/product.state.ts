import { Product } from '../../shared/models/product.model';

export interface ProductState {
  products: Product[];
  loading: boolean;
  error: string | null;
  selectedProduct: Product | null;
}

export const initialProductState: ProductState = {
  products: [],
  loading: false,
  error: null,
  selectedProduct: null
};
