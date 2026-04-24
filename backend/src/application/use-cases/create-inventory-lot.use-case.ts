import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryLot } from '../../domain/entities/inventory-lot.entity';
import { InventoryLotRepository } from '../../domain/repositories/inventory-lot.repository';
import { ProductTypeRepository } from '../../domain/repositories/product-type.repository';
import { ProductTypeId } from '../../domain/value-objects/product-type-id.vo';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { INVENTORY_LOT_REPOSITORY, PRODUCT_TYPE_REPOSITORY } from '../tokens';
import { parseQuantityUnit } from '../utils/enum-parsers';

export interface CreateInventoryLotCommand {
  userId: string;
  productTypeId: string;
  variantName?: string;
  quantity: number;
  unit: string;
  expiresAt?: Date;
  purchaseDate?: Date;
}

@Injectable()
export class CreateInventoryLotUseCase {
  constructor(
    @Inject(INVENTORY_LOT_REPOSITORY)
    private readonly inventoryLotRepository: InventoryLotRepository,
    @Inject(PRODUCT_TYPE_REPOSITORY)
    private readonly productTypeRepository: ProductTypeRepository,
  ) {}

  async execute(command: CreateInventoryLotCommand): Promise<InventoryLot> {
    const userId = UserId.fromString(command.userId);
    const productType = await this.productTypeRepository.findById(
      ProductTypeId.fromString(command.productTypeId),
    );

    if (!productType || productType.userId.toString() !== userId.toString()) {
      throw new NotFoundException('Product type not found for this user');
    }

    const unit = parseQuantityUnit(command.unit);

    if (productType.defaultUnit !== unit) {
      throw new BadRequestException(
        `Lot unit must match product type default unit (${productType.defaultUnit})`,
      );
    }

    const inventoryLot = InventoryLot.create(
      userId,
      productType.id,
      command.variantName,
      command.quantity,
      unit,
      command.expiresAt,
      command.purchaseDate,
    );

    return this.inventoryLotRepository.save(inventoryLot);
  }
}
