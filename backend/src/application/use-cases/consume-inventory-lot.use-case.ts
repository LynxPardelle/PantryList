import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryLot } from '../../domain/entities/inventory-lot.entity';
import {
  WasteEvent,
  WasteReason,
} from '../../domain/entities/waste-event.entity';
import { InventoryLotRepository } from '../../domain/repositories/inventory-lot.repository';
import { ProductTypeRepository } from '../../domain/repositories/product-type.repository';
import { WasteEventRepository } from '../../domain/repositories/waste-event.repository';
import { InventoryLotId } from '../../domain/value-objects/inventory-lot-id.vo';
import { UserId } from '../../domain/value-objects/user-id.vo';
import {
  INVENTORY_LOT_REPOSITORY,
  PRODUCT_TYPE_REPOSITORY,
  WASTE_EVENT_REPOSITORY,
} from '../tokens';

export interface ConsumeInventoryLotOptions {
  wasteReason?: WasteReason;
  wasteNote?: string;
}

@Injectable()
export class ConsumeInventoryLotUseCase {
  constructor(
    @Inject(INVENTORY_LOT_REPOSITORY)
    private readonly inventoryLotRepository: InventoryLotRepository,
    @Inject(PRODUCT_TYPE_REPOSITORY)
    private readonly productTypeRepository: ProductTypeRepository,
    @Inject(WASTE_EVENT_REPOSITORY)
    private readonly wasteEventRepository: WasteEventRepository,
  ) {}

  async execute(
    lotId: string,
    userId: string,
    quantity: number,
    options: ConsumeInventoryLotOptions = {},
  ): Promise<InventoryLot | null> {
    const inventoryLot = await this.inventoryLotRepository.findById(
      InventoryLotId.fromString(lotId),
    );

    if (!inventoryLot) {
      throw new NotFoundException('Inventory lot not found');
    }

    if (
      inventoryLot.userId.toString() !== UserId.fromString(userId).toString()
    ) {
      throw new NotFoundException('Inventory lot not found for this user');
    }

    if (quantity <= 0) {
      throw new BadRequestException(
        'Consume quantity must be greater than zero',
      );
    }

    if (quantity > inventoryLot.quantity) {
      throw new BadRequestException('Consume quantity exceeds lot quantity');
    }

    if (options.wasteReason) {
      const productType = await this.productTypeRepository.findById(
        inventoryLot.productTypeId,
      );

      if (!productType) {
        throw new NotFoundException('Product type not found');
      }

      await this.wasteEventRepository.save(
        WasteEvent.create({
          userId: inventoryLot.userId,
          productTypeId: inventoryLot.productTypeId,
          inventoryLotId: inventoryLot.id,
          productName: productType.baseName,
          quantity,
          unit: inventoryLot.unit,
          reason: options.wasteReason,
          note: options.wasteNote,
          estimatedLoss: estimateLoss(
            quantity,
            productType.shoppingMetadata.estimatedUnitPrice,
          ),
        }),
      );
    }

    inventoryLot.consume(quantity);

    if (inventoryLot.isEmpty()) {
      await this.inventoryLotRepository.delete(inventoryLot.id);
      return null;
    }

    return this.inventoryLotRepository.save(inventoryLot);
  }
}

function estimateLoss(
  quantity: number,
  estimatedUnitPrice: number | undefined,
): number | undefined {
  if (
    estimatedUnitPrice === undefined ||
    !Number.isFinite(estimatedUnitPrice)
  ) {
    return undefined;
  }

  return Number((quantity * estimatedUnitPrice).toFixed(2));
}
