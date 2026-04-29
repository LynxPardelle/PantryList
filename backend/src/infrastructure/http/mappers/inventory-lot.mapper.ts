import { InventoryLot } from '../../../domain/entities/inventory-lot.entity';
import { InventoryLotResponseDto } from '../dtos/inventory-lot-response.dto';

export class InventoryLotMapper {
  static toResponse(inventoryLot: InventoryLot): InventoryLotResponseDto {
    const primitives = inventoryLot.toPrimitives();

    return {
      id: primitives.id,
      userId: primitives.userId,
      productTypeId: primitives.productTypeId,
      variantName: primitives.variantName,
      quantity: primitives.quantity,
      unit: primitives.unit,
      expiresAt: primitives.expiresAt,
      purchaseDate: primitives.purchaseDate,
      archivedAt: primitives.archivedAt,
      archivedReason: primitives.archivedReason,
      expirationStatus: inventoryLot.getExpirationStatus(),
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };
  }
}
