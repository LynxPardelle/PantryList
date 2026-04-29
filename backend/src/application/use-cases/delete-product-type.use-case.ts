import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductType } from '../../domain/entities/product-type.entity';
import { InventoryLotRepository } from '../../domain/repositories/inventory-lot.repository';
import { ProductTypeRepository } from '../../domain/repositories/product-type.repository';
import { ProductTypeId } from '../../domain/value-objects/product-type-id.vo';
import { UserId } from '../../domain/value-objects/user-id.vo';
import {
  INVENTORY_LOT_REPOSITORY,
  PRODUCT_TYPE_REPOSITORY,
} from '../tokens';

export interface DeleteProductTypeCommand {
  productTypeId: string;
  userId: string;
  confirmationText: string;
}

@Injectable()
export class DeleteProductTypeUseCase {
  constructor(
    @Inject(PRODUCT_TYPE_REPOSITORY)
    private readonly productTypeRepository: ProductTypeRepository,
    @Inject(INVENTORY_LOT_REPOSITORY)
    private readonly inventoryLotRepository: InventoryLotRepository,
  ) {}

  async execute(command: DeleteProductTypeCommand): Promise<void> {
    const productType = await this.findOwnedProductType(
      command.productTypeId,
      command.userId,
    );

    if (!productType.canDeletePermanently()) {
      throw new BadRequestException(
        'Archive the product type before deleting it permanently',
      );
    }

    try {
      productType.assertDeleteConfirmation(command.confirmationText);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }

    await this.inventoryLotRepository.deleteByProductTypeId(productType.id);
    await this.productTypeRepository.delete(productType.id);
  }

  private async findOwnedProductType(
    productTypeId: string,
    userId: string,
  ): Promise<ProductType> {
    const productType = await this.productTypeRepository.findById(
      ProductTypeId.fromString(productTypeId),
    );

    if (
      !productType ||
      productType.userId.toString() !== UserId.fromString(userId).toString()
    ) {
      throw new NotFoundException('Product type not found');
    }

    return productType;
  }
}
