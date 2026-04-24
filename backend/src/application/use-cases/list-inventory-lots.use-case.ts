import { Inject, Injectable } from '@nestjs/common';
import { InventoryLot } from '../../domain/entities/inventory-lot.entity';
import { InventoryLotRepository } from '../../domain/repositories/inventory-lot.repository';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { INVENTORY_LOT_REPOSITORY } from '../tokens';

@Injectable()
export class ListInventoryLotsUseCase {
  constructor(
    @Inject(INVENTORY_LOT_REPOSITORY)
    private readonly inventoryLotRepository: InventoryLotRepository,
  ) {}

  async execute(userId: string): Promise<InventoryLot[]> {
    return this.inventoryLotRepository.findByUserId(UserId.fromString(userId));
  }
}
