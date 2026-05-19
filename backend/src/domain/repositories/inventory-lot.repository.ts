import { InventoryLot } from '../entities/inventory-lot.entity';
import { InventoryLotId } from '../value-objects/inventory-lot-id.vo';
import { ProductTypeId } from '../value-objects/product-type-id.vo';
import { UserId } from '../value-objects/user-id.vo';

export interface InventoryLotRepository {
  save(lot: InventoryLot): Promise<InventoryLot>;
  findById(id: InventoryLotId): Promise<InventoryLot | null>;
  findByUserId(userId: UserId): Promise<InventoryLot[]>;
  findArchivedByUserId(userId: UserId): Promise<InventoryLot[]>;
  findByProductTypeId(productTypeId: ProductTypeId): Promise<InventoryLot[]>;
  reassignUserOwnership(fromUserId: UserId, toUserId: UserId): Promise<number>;
  delete(id: InventoryLotId): Promise<void>;
  deleteByProductTypeId(productTypeId: ProductTypeId): Promise<void>;
  deleteByUserId(userId: UserId): Promise<number>;
}
