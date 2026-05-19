import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InventoryLotRepository } from '../../domain/repositories/inventory-lot.repository';
import { ProductTypeRepository } from '../../domain/repositories/product-type.repository';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { INVENTORY_LOT_REPOSITORY, PRODUCT_TYPE_REPOSITORY } from '../tokens';

export interface DeletePantryDataCommand {
  userId: string;
  confirmationText: string;
}

export interface DeletePantryDataResult {
  deletedInventoryLotCount: number;
  deletedProductTypeCount: number;
}

const DELETE_PANTRY_DATA_CONFIRMATION = 'ELIMINAR';

@Injectable()
export class DeletePantryDataUseCase {
  constructor(
    @Inject(PRODUCT_TYPE_REPOSITORY)
    private readonly productTypeRepository: ProductTypeRepository,
    @Inject(INVENTORY_LOT_REPOSITORY)
    private readonly inventoryLotRepository: InventoryLotRepository,
  ) {}

  async execute(
    command: DeletePantryDataCommand,
  ): Promise<DeletePantryDataResult> {
    if (command.confirmationText.trim() !== DELETE_PANTRY_DATA_CONFIRMATION) {
      throw new BadRequestException(
        `Confirmation text must be ${DELETE_PANTRY_DATA_CONFIRMATION}`,
      );
    }

    const userId = UserId.fromString(command.userId);
    const deletedInventoryLotCount =
      await this.inventoryLotRepository.deleteByUserId(userId);
    const deletedProductTypeCount =
      await this.productTypeRepository.deleteByUserId(userId);

    return {
      deletedInventoryLotCount,
      deletedProductTypeCount,
    };
  }
}
