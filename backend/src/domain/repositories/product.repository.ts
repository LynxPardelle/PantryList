import { Product } from '../entities/product.entity';
import { ProductId } from '../value-objects/product-id.vo';
import { UserId } from '../value-objects/user-id.vo';
import { ProductCategory, ProductStatus } from '../enums';

export interface ProductFilter {
  userId?: string;
  category?: ProductCategory;
  status?: ProductStatus;
}

export interface ProductRepository {
  save(product: Product): Promise<Product>;
  findById(id: ProductId): Promise<Product | null>;
  findByUserId(userId: UserId): Promise<Product[]>;
  findByCategory(category: ProductCategory): Promise<Product[]>;
  findByStatus(status: ProductStatus): Promise<Product[]>;
  reassignUserOwnership(fromUserId: UserId, toUserId: UserId): Promise<number>;
  delete(id: ProductId): Promise<void>;
  findAll(filter?: ProductFilter): Promise<Product[]>;
}
