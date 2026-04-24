import { Inject, Injectable } from '@nestjs/common';
import { InventoryLotRepository } from '../../domain/repositories/inventory-lot.repository';
import { ProductTypeRepository } from '../../domain/repositories/product-type.repository';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { INVENTORY_LOT_REPOSITORY, PRODUCT_TYPE_REPOSITORY } from '../tokens';
import { PantryOverview } from '../read-models/pantry-overview.read-model';
import { buildPantryOverview } from '../utils/pantry-overview.builder';

@Injectable()
export class GetPantryOverviewUseCase {
  constructor(
    @Inject(PRODUCT_TYPE_REPOSITORY)
    private readonly productTypeRepository: ProductTypeRepository,
    @Inject(INVENTORY_LOT_REPOSITORY)
    private readonly inventoryLotRepository: InventoryLotRepository,
  ) {}

  async execute(userId: string): Promise<PantryOverview> {
    const normalizedUserId = UserId.fromString(userId);
    const [productTypes, inventoryLots] = await Promise.all([
      this.productTypeRepository.findByUserId(normalizedUserId),
      this.inventoryLotRepository.findByUserId(normalizedUserId),
    ]);

    return buildPantryOverview(userId, productTypes, inventoryLots);
  }
}
