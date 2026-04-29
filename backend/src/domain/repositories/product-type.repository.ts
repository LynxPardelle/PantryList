import { ProductType } from '../entities/product-type.entity';
import { ProductTypeId } from '../value-objects/product-type-id.vo';
import { UserId } from '../value-objects/user-id.vo';

export interface ProductTypeRepository {
  save(productType: ProductType): Promise<ProductType>;
  findById(id: ProductTypeId): Promise<ProductType | null>;
  findByUserId(userId: UserId): Promise<ProductType[]>;
  findArchivedByUserId(userId: UserId): Promise<ProductType[]>;
  searchByUserId(userId: UserId, search?: string): Promise<ProductType[]>;
  findByBaseName(userId: UserId, baseName: string): Promise<ProductType | null>;
  reassignUserOwnership(fromUserId: UserId, toUserId: UserId): Promise<number>;
  delete(id: ProductTypeId): Promise<void>;
}
