import { InventoryLotPrimitives } from '../../domain/entities/inventory-lot.entity';
import { ProductTypePrimitives } from '../../domain/entities/product-type.entity';

export interface ArchivedPantryItems {
  productTypes: ProductTypePrimitives[];
  inventoryLots: InventoryLotPrimitives[];
}
