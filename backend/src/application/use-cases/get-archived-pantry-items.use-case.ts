import { Inject, Injectable } from '@nestjs/common';
import { InventoryLotRepository } from '../../domain/repositories/inventory-lot.repository';
import { ProductTypeRepository } from '../../domain/repositories/product-type.repository';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { ArchivedPantryItems } from '../read-models/archived-pantry-items.read-model';
import { MAX_ARCHIVED_PANTRY_PAGE_SIZE } from '../constants/query-limits';
import { INVENTORY_LOT_REPOSITORY, PRODUCT_TYPE_REPOSITORY } from '../tokens';

export interface ArchivedPantryPageRequest {
  limit?: number;
  productTypesCursor?: string;
  inventoryLotsCursor?: string;
  includeProductTypes?: boolean;
  includeInventoryLots?: boolean;
}

@Injectable()
export class GetArchivedPantryItemsUseCase {
  constructor(
    @Inject(PRODUCT_TYPE_REPOSITORY)
    private readonly productTypeRepository: ProductTypeRepository,
    @Inject(INVENTORY_LOT_REPOSITORY)
    private readonly inventoryLotRepository: InventoryLotRepository,
  ) {}

  async execute(
    userId: string,
    request?: ArchivedPantryPageRequest,
  ): Promise<ArchivedPantryItems> {
    const normalizedUserId = UserId.fromString(userId);

    if (request) {
      const limit = clampArchivedPageLimit(request.limit);
      const includeProductTypes = request.includeProductTypes !== false;
      const includeInventoryLots = request.includeInventoryLots !== false;
      const [productTypesPage, inventoryLotsPage] = await Promise.all([
        includeProductTypes
          ? this.productTypeRepository.findArchivedPageByUserId(
              normalizedUserId,
              {
                limit,
                cursor: request.productTypesCursor,
              },
            )
          : Promise.resolve({ items: [], nextCursor: undefined }),
        includeInventoryLots
          ? this.inventoryLotRepository.findArchivedPageByUserId(
              normalizedUserId,
              {
                limit,
                cursor: request.inventoryLotsCursor,
              },
            )
          : Promise.resolve({ items: [], nextCursor: undefined }),
      ]);

      return {
        productTypes: productTypesPage.items.map((productType) =>
          productType.toPrimitives(),
        ),
        inventoryLots: inventoryLotsPage.items.map((lot) => lot.toPrimitives()),
        pagination: {
          limit,
          productTypesNextCursor: productTypesPage.nextCursor,
          inventoryLotsNextCursor: inventoryLotsPage.nextCursor,
          hasMoreProductTypes: Boolean(productTypesPage.nextCursor),
          hasMoreInventoryLots: Boolean(inventoryLotsPage.nextCursor),
        },
      };
    }

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

function clampArchivedPageLimit(limit: number | undefined): number {
  return Math.min(
    Math.max(1, Math.floor(limit ?? MAX_ARCHIVED_PANTRY_PAGE_SIZE)),
    MAX_ARCHIVED_PANTRY_PAGE_SIZE,
  );
}
