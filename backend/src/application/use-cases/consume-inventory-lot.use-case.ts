import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryLot } from '../../domain/entities/inventory-lot.entity';
import { InventoryLotRepository } from '../../domain/repositories/inventory-lot.repository';
import { InventoryLotId } from '../../domain/value-objects/inventory-lot-id.vo';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { INVENTORY_LOT_REPOSITORY } from '../tokens';

@Injectable()
export class ConsumeInventoryLotUseCase {
  constructor(
    @Inject(INVENTORY_LOT_REPOSITORY)
    private readonly inventoryLotRepository: InventoryLotRepository,
  ) {}

  async execute(
    lotId: string,
    userId: string,
    quantity: number,
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

    inventoryLot.consume(quantity);

    if (inventoryLot.isEmpty()) {
      await this.inventoryLotRepository.delete(inventoryLot.id);
      return null;
    }

    return this.inventoryLotRepository.save(inventoryLot);
  }
}
