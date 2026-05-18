import {
  DepletingProductGroup,
  ExpiringProductGroup,
  PriceReferenceItem,
  PantryLotSummary,
  PantryOverview,
  PantryStapleItem,
  ShoppingPlanItem,
  ShoppingRouteGroup,
} from '../../../application/read-models/pantry-overview.read-model';
import {
  DepletingProductGroupResponseDto,
  ExpiringProductGroupResponseDto,
  PriceReferenceItemResponseDto,
  PantryLotSummaryResponseDto,
  PantryOverviewResponseDto,
  PantryStapleItemResponseDto,
  ShoppingPlanItemResponseDto,
  ShoppingRouteGroupResponseDto,
} from '../dtos/pantry-overview-response.dto';

export class PantryOverviewMapper {
  static toResponse(overview: PantryOverview): PantryOverviewResponseDto {
    return {
      userId: overview.userId,
      generatedAt: overview.generatedAt,
      preferences: overview.preferences,
      items: overview.items.map((item) => ({
        productTypeId: item.productTypeId,
        baseName: item.baseName,
        category: item.category,
        defaultUnit: item.defaultUnit,
        totalQuantity: item.totalQuantity,
        lotCount: item.lotCount,
        nextExpirationAt: item.nextExpirationAt,
        expiringSoonQuantity: item.expiringSoonQuantity,
        hasDepletionRule: item.hasDepletionRule,
        depletionRule: item.depletionRule,
        effectivePlanningSettings: item.effectivePlanningSettings,
        shoppingMetadata: item.shoppingMetadata,
        estimatedCurrentQuantity: item.estimatedCurrentQuantity,
        estimatedConsumedQuantity: item.estimatedConsumedQuantity,
        estimatedDepletionAt: item.estimatedDepletionAt,
        variants: item.variants,
        lots: item.lots.map((lot) => this.toLotSummaryResponse(lot)),
      })),
      expiringItems: overview.expiringItems.map((item) =>
        this.toExpiringGroupResponse(item),
      ),
      depletingItems: overview.depletingItems.map((item) =>
        this.toDepletingGroupResponse(item),
      ),
      shoppingPlanItems: overview.shoppingPlanItems.map((item) =>
        this.toShoppingPlanItemResponse(item),
      ),
      shoppingPlanEstimatedTotal: overview.shoppingPlanEstimatedTotal,
      shoppingRouteGroups: (overview.shoppingRouteGroups ?? []).map((group) =>
        this.toShoppingRouteGroupResponse(group),
      ),
      priceReferenceItems: (overview.priceReferenceItems ?? []).map((item) =>
        this.toPriceReferenceItemResponse(item),
      ),
      stapleItems: overview.stapleItems.map((item) =>
        this.toStapleItemResponse(item),
      ),
      valueInsights: overview.valueInsights,
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

  static toDepletingGroupResponse(
    item: DepletingProductGroup,
  ): DepletingProductGroupResponseDto {
    return {
      productTypeId: item.productTypeId,
      baseName: item.baseName,
      category: item.category,
      defaultUnit: item.defaultUnit,
      totalQuantity: item.totalQuantity,
      estimatedCurrentQuantity: item.estimatedCurrentQuantity,
      estimatedConsumedQuantity: item.estimatedConsumedQuantity,
      estimatedDepletionAt: item.estimatedDepletionAt,
      depletionRule: item.depletionRule,
      effectivePlanningSettings: item.effectivePlanningSettings,
      shoppingMetadata: item.shoppingMetadata,
    };
  }

  static toShoppingPlanItemResponse(
    item: ShoppingPlanItem,
  ): ShoppingPlanItemResponseDto {
    return {
      productTypeId: item.productTypeId,
      baseName: item.baseName,
      category: item.category,
      defaultUnit: item.defaultUnit,
      totalQuantity: item.totalQuantity,
      estimatedCurrentQuantity: item.estimatedCurrentQuantity,
      estimatedConsumedQuantity: item.estimatedConsumedQuantity,
      estimatedDepletionAt: item.estimatedDepletionAt,
      recommendedPurchaseAt: item.recommendedPurchaseAt,
      suggestedPurchaseQuantity: item.suggestedPurchaseQuantity,
      estimatedUnitPrice: item.estimatedUnitPrice,
      estimatedLineTotal: item.estimatedLineTotal,
      urgency: item.urgency,
      depletionRule: item.depletionRule,
      effectivePlanningSettings: item.effectivePlanningSettings,
      shoppingMetadata: item.shoppingMetadata,
    };
  }

  static toShoppingRouteGroupResponse(
    group: ShoppingRouteGroup,
  ): ShoppingRouteGroupResponseDto {
    return {
      shoppingLocation: group.shoppingLocation,
      itemCount: group.itemCount,
      urgentItemCount: group.urgentItemCount,
      promoOnlyCount: group.promoOnlyCount,
      missingPriceCount: group.missingPriceCount,
      estimatedTotal: group.estimatedTotal,
      nextRecommendedPurchaseAt: group.nextRecommendedPurchaseAt,
      items: group.items.map((item) => this.toShoppingPlanItemResponse(item)),
    };
  }

  static toPriceReferenceItemResponse(
    item: PriceReferenceItem,
  ): PriceReferenceItemResponseDto {
    return {
      productTypeId: item.productTypeId,
      baseName: item.baseName,
      category: item.category,
      defaultUnit: item.defaultUnit,
      shoppingLocation: item.shoppingLocation,
      preferredBrand: item.preferredBrand,
      substituteBrand: item.substituteBrand,
      estimatedUnitPrice: item.estimatedUnitPrice,
      buyOnlyOnPromo: item.buyOnlyOnPromo,
      updatedAt: item.updatedAt,
    };
  }

  static toStapleItemResponse(
    item: PantryStapleItem,
  ): PantryStapleItemResponseDto {
    return {
      productTypeId: item.productTypeId,
      baseName: item.baseName,
      category: item.category,
      defaultUnit: item.defaultUnit,
      totalQuantity: item.totalQuantity,
      estimatedCurrentQuantity: item.estimatedCurrentQuantity,
      suggestedPurchaseQuantity: item.suggestedPurchaseQuantity,
      estimatedUnitPrice: item.estimatedUnitPrice,
      estimatedRestockTotal: item.estimatedRestockTotal,
      status: item.status,
      shoppingMetadata: item.shoppingMetadata,
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
      purchaseDate: lot.purchaseDate,
      expirationStatus: lot.expirationStatus,
      updatedAt: lot.updatedAt,
    };
  }
}
