import { Inject, Injectable } from '@nestjs/common';
import { InventoryLotRepository } from '../../domain/repositories/inventory-lot.repository';
import { ProductTypeRepository } from '../../domain/repositories/product-type.repository';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { ArchivedPantryItems } from '../read-models/archived-pantry-items.read-model';
import { INVENTORY_LOT_REPOSITORY, PRODUCT_TYPE_REPOSITORY } from '../tokens';

@Injectable()
export class GetArchivedPantryItemsUseCase {
  constructor(
    @Inject(PRODUCT_TYPE_REPOSITORY)
    private readonly productTypeRepository: ProductTypeRepository,
    @Inject(INVENTORY_LOT_REPOSITORY)
    private readonly inventoryLotRepository: InventoryLotRepository,
  ) {}

  async execute(userId: string): Promise<ArchivedPantryItems> {
    const normalizedUserId = UserId.fromString(userId);
    const [productTypes, inventoryLots] = await Promise.all([
      this.productTypeRepository.findArchivedByUserId(normalizedUserId),
      this.inventoryLotRepository.findArchivedByUserId(normalizedUserId),
    ]);

    return {
      productTypes: productTypes.map((productType) =>
        productType.toPrimitives(),
      ),
      inventoryLots: inventoryLots.map((lot) => lot.toPrimitives()),
    };
  }
}
