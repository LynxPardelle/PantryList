import {
  ExpiringProductGroup,
  PantryLotSummary,
  PantryOverview,
} from '../../../application/read-models/pantry-overview.read-model';
import {
  ExpiringProductGroupResponseDto,
  PantryLotSummaryResponseDto,
  PantryOverviewResponseDto,
} from '../dtos/pantry-overview-response.dto';

export class PantryOverviewMapper {
  static toResponse(overview: PantryOverview): PantryOverviewResponseDto {
    return {
      userId: overview.userId,
      generatedAt: overview.generatedAt,
      items: overview.items.map((item) => ({
        productTypeId: item.productTypeId,
        baseName: item.baseName,
        category: item.category,
        defaultUnit: item.defaultUnit,
        totalQuantity: item.totalQuantity,
        lotCount: item.lotCount,
        nextExpirationAt: item.nextExpirationAt,
        expiringSoonQuantity: item.expiringSoonQuantity,
        variants: item.variants,
        lots: item.lots.map((lot) => this.toLotSummaryResponse(lot)),
      })),
      expiringItems: overview.expiringItems.map((item) =>
        this.toExpiringGroupResponse(item),
      ),
    };
  }

  static toExpiringGroupResponse(
    item: ExpiringProductGroup,
  ): ExpiringProductGroupResponseDto {
    return {
      productTypeId: item.productTypeId,
      baseName: item.baseName,
      category: item.category,
      totalExpiringQuantity: item.totalExpiringQuantity,
      nextExpirationAt: item.nextExpirationAt,
      lotCount: item.lotCount,
      lots: item.lots.map((lot) => this.toLotSummaryResponse(lot)),
    };
  }

  private static toLotSummaryResponse(
    lot: PantryLotSummary,
  ): PantryLotSummaryResponseDto {
    return {
      lotId: lot.lotId,
      variantName: lot.variantName,
      quantity: lot.quantity,
      unit: lot.unit,
      expiresAt: lot.expiresAt,
      expirationStatus: lot.expirationStatus,
      updatedAt: lot.updatedAt,
    };
  }
}
