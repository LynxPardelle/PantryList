import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryLot } from '../../domain/entities/inventory-lot.entity';
import { InventoryLotRepository } from '../../domain/repositories/inventory-lot.repository';
import { InventoryLotId } from '../../domain/value-objects/inventory-lot-id.vo';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { INVENTORY_LOT_REPOSITORY } from '../tokens';

export interface RestoreInventoryLotCommand {
  lotId: string;
  userId: string;
}

@Injectable()
export class RestoreInventoryLotUseCase {
  constructor(
    @Inject(INVENTORY_LOT_REPOSITORY)
    private readonly inventoryLotRepository: InventoryLotRepository,
  ) {}

  async execute(command: RestoreInventoryLotCommand): Promise<InventoryLot> {
    const lot = await this.findOwnedLot(command.lotId, command.userId);

    lot.restore();

    return this.inventoryLotRepository.save(lot);
  }

  private async findOwnedLot(
    lotId: string,
    userId: string,
  ): Promise<InventoryLot> {
    const lot = await this.inventoryLotRepository.findById(
      InventoryLotId.fromString(lotId),
    );

    if (!lot || lot.userId.toString() !== UserId.fromString(userId).toString()) {
      throw new NotFoundException('Inventory lot not found');
    }

    return lot;
  }
}
