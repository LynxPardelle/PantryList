import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ApiInventoryLot,
  ApiArchivedPantryItems,
  ApiPantryExport,
  ApiDepletingProductGroup,
  ApiPantryLotSummary,
  ApiPantryOverview,
  ApiPantryOverviewItem,
  ApiPublicShoppingShare,
  ApiShoppingShare,
  ApiPantryStapleCatalogGroup,
  ApiPantryStapleItem,
  ApiPriceReferenceItem,
  ApiProductType,
  ApiProductTypeDepletionRule,
  ApiShoppingPlanItem,
  ApiShoppingRouteCategoryGroup,
  ApiShoppingRouteGroup,
  ArchivedPantryItems,
  ArchivePantryItemRequest,
  CloseShoppingPurchaseRequest,
  ConsumeInventoryLotRequest,
  CreateInventoryLotRequest,
  CreateShoppingShareRequest,
  CreateProductTypeRequest,
  DeletePantryItemRequest,
  DepletingProductGroup,
  InventoryLot,
  PantryLotSummary,
  PantryOverview,
  PantryOverviewItem,
  PantryStapleCatalogGroup,
  PantryStapleItem,
  PriceReferenceItem,
  ProductTypeDepletionRule,
  ProductTypeDepletionRuleRequest,
  ProductTypePlanningSettingsRequest,
  ProductTypeShoppingMetadata,
  ProductTypeShoppingMetadataRequest,
  ProductType,
  PublicShoppingShare,
  RegisterLotRequest,
  ShoppingShare,
  ShoppingPlanItem,
  ShoppingRouteCategoryGroup,
  ShoppingRouteGroup,
} from '../../shared/models/pantry.model';

@Injectable({
  providedIn: 'root',
})
export class PantryService {
  private readonly apiUrl = environment.apiUrl;
  private readonly productTypesUrl = `${this.apiUrl}/product-types`;
  private readonly inventoryLotsUrl = `${this.apiUrl}/inventory-lots`;
  private readonly pantryOverviewUrl = `${this.apiUrl}/pantry/overview`;
  private readonly archivedPantryUrl = `${this.apiUrl}/pantry/archived`;
  private readonly pantryExportUrl = `${this.apiUrl}/pantry/export`;
  private readonly pantryCheckoutUrl = `${this.apiUrl}/pantry/checkout`;
  private readonly pantryShoppingSharesUrl = `${this.apiUrl}/pantry/shopping-shares`;
  private readonly publicShoppingSharesUrl = `${this.apiUrl}/shopping-shares`;

  constructor(private readonly http: HttpClient) {}

  getPantryOverview(): Observable<PantryOverview> {
    return this.http
      .get<ApiPantryOverview>(this.pantryOverviewUrl, { withCredentials: true })
      .pipe(map((overview) => this.normalizePantryOverview(overview)));
  }

  searchProductTypes(search: string): Observable<ProductType[]> {
    return this.http
      .get<ApiProductType[]>(this.productTypesUrl, {
        params: { search },
        withCredentials: true,
      })
      .pipe(
        map((productTypes) =>
          productTypes.map((productType) => this.normalizeProductType(productType)),
        ),
      );
  }

  createProductType(request: CreateProductTypeRequest): Observable<ProductType> {
    return this.http
      .post<ApiProductType>(this.productTypesUrl, request, {
        withCredentials: true,
      })
      .pipe(map((productType) => this.normalizeProductType(productType)));
  }

  updateProductTypeDepletionRule(
    productTypeId: string,
    defaultDepletionRule: ProductTypeDepletionRuleRequest,
  ): Observable<ProductType> {
    return this.http
      .patch<ApiProductType>(`${this.productTypesUrl}/${productTypeId}/depletion-rule`, {
        defaultDepletionRule,
      }, {
        withCredentials: true,
      })
      .pipe(map((productType) => this.normalizeProductType(productType)));
  }

  updateProductTypePlanningSettings(
    productTypeId: string,
    planningSettings: ProductTypePlanningSettingsRequest,
  ): Observable<ProductType> {
    return this.http
      .patch<ApiProductType>(
        `${this.productTypesUrl}/${productTypeId}/planning-settings`,
        planningSettings,
        { withCredentials: true },
      )
      .pipe(map((productType) => this.normalizeProductType(productType)));
  }

  updateProductTypeShoppingMetadata(
    productTypeId: string,
    shoppingMetadata: ProductTypeShoppingMetadataRequest,
  ): Observable<ProductType> {
    return this.http
      .patch<ApiProductType>(
        `${this.productTypesUrl}/${productTypeId}/shopping-metadata`,
        shoppingMetadata,
        { withCredentials: true },
      )
      .pipe(map((productType) => this.normalizeProductType(productType)));
  }

  archiveProductType(
    productTypeId: string,
    request: ArchivePantryItemRequest = {},
  ): Observable<ProductType> {
    return this.http
      .post<ApiProductType>(`${this.productTypesUrl}/${productTypeId}/archive`, request, {
        withCredentials: true,
      })
      .pipe(map((productType) => this.normalizeProductType(productType)));
  }

  restoreProductType(productTypeId: string): Observable<ProductType> {
    return this.http
      .post<ApiProductType>(`${this.productTypesUrl}/${productTypeId}/restore`, {}, {
        withCredentials: true,
      })
      .pipe(map((productType) => this.normalizeProductType(productType)));
  }

  deleteProductType(
    productTypeId: string,
    request: DeletePantryItemRequest,
  ): Observable<void> {
    return this.http.delete<void>(`${this.productTypesUrl}/${productTypeId}`, {
      body: request,
      withCredentials: true,
    });
  }

  createInventoryLot(request: CreateInventoryLotRequest): Observable<InventoryLot> {
    return this.http
      .post<ApiInventoryLot>(this.inventoryLotsUrl, request, {
        withCredentials: true,
      })
      .pipe(map((inventoryLot) => this.normalizeInventoryLot(inventoryLot)));
  }

  registerLot(request: RegisterLotRequest): Observable<InventoryLot> {
    if (request.selectionMode === 'existing') {
      if (!request.existingProductTypeId) {
        throw new Error('An existing product type must be selected');
      }

      const createLot = () =>
        this.createInventoryLot({
          productTypeId: request.existingProductTypeId!,
          variantName: request.variantName,
          quantity: request.quantity,
          unit: request.unit,
          expiresAt: request.expiresAt,
          purchaseDate: request.purchaseDate,
        });

      return request.defaultDepletionRule
        ? this.updateProductTypeDepletionRule(
            request.existingProductTypeId,
            request.defaultDepletionRule,
          ).pipe(switchMap(createLot))
        : createLot();
    }

    if (!request.newProductType) {
      throw new Error('A new product type payload is required');
    }

    return this.createProductType({
      baseName: request.newProductType.baseName,
      category: request.newProductType.category,
      defaultUnit: request.newProductType.defaultUnit,
      defaultDepletionRule: request.newProductType.defaultDepletionRule,
      shoppingMetadata: request.newProductType.shoppingMetadata,
    }).pipe(
      switchMap((productType) =>
        this.createInventoryLot({
          productTypeId: productType.id,
          variantName: request.variantName,
          quantity: request.quantity,
          unit: request.unit,
          expiresAt: request.expiresAt,
          purchaseDate: request.purchaseDate,
        }),
      ),
    );
  }

  consumeInventoryLot(
    lotId: string,
    request: ConsumeInventoryLotRequest,
  ): Observable<InventoryLot | null> {
    return this.http
      .post<ApiInventoryLot | null>(`${this.inventoryLotsUrl}/${lotId}/consume`, request, {
        withCredentials: true,
      })
      .pipe(
        map((inventoryLot) =>
          inventoryLot ? this.normalizeInventoryLot(inventoryLot) : null,
        ),
      );
  }

  archiveInventoryLot(
    lotId: string,
    request: ArchivePantryItemRequest = {},
  ): Observable<InventoryLot> {
    return this.http
      .post<ApiInventoryLot>(`${this.inventoryLotsUrl}/${lotId}/archive`, request, {
        withCredentials: true,
      })
      .pipe(map((inventoryLot) => this.normalizeInventoryLot(inventoryLot)));
  }

  restoreInventoryLot(lotId: string): Observable<InventoryLot> {
    return this.http
      .post<ApiInventoryLot>(`${this.inventoryLotsUrl}/${lotId}/restore`, {}, {
        withCredentials: true,
      })
      .pipe(map((inventoryLot) => this.normalizeInventoryLot(inventoryLot)));
  }

  deleteInventoryLot(
    lotId: string,
    request: DeletePantryItemRequest,
  ): Observable<void> {
    return this.http.delete<void>(`${this.inventoryLotsUrl}/${lotId}`, {
      body: request,
      withCredentials: true,
    });
  }

  getArchivedPantryItems(): Observable<ArchivedPantryItems> {
    return this.http.get<ApiArchivedPantryItems>(this.archivedPantryUrl, {
      withCredentials: true,
    }).pipe(
      map((items) => ({
        productTypes: items.productTypes.map((productType) =>
          this.normalizeProductType(productType),
        ),
        inventoryLots: items.inventoryLots.map((inventoryLot) =>
          this.normalizeInventoryLot(inventoryLot),
        ),
      })),
    );
  }

  exportPantryData(): Observable<ApiPantryExport> {
    return this.http.get<ApiPantryExport>(this.pantryExportUrl, {
      withCredentials: true,
    });
  }

  closeShoppingPurchase(
    request: CloseShoppingPurchaseRequest,
  ): Observable<InventoryLot[]> {
    return this.http
      .post<ApiInventoryLot[]>(this.pantryCheckoutUrl, request, {
        withCredentials: true,
      })
      .pipe(
        map((inventoryLots) =>
          inventoryLots.map((inventoryLot) =>
            this.normalizeInventoryLot(inventoryLot),
          ),
        ),
      );
  }

  createShoppingShare(
    request: CreateShoppingShareRequest,
  ): Observable<ShoppingShare> {
    return this.http
      .post<ApiShoppingShare>(this.pantryShoppingSharesUrl, request, {
        withCredentials: true,
      })
      .pipe(map((share) => this.normalizeShoppingShare(share)));
  }

  resolveShoppingShare(token: string): Observable<PublicShoppingShare> {
    return this.http
      .get<ApiPublicShoppingShare>(
        `${this.publicShoppingSharesUrl}/${encodeURIComponent(token)}`,
      )
      .pipe(map((share) => this.normalizePublicShoppingShare(share)));
  }

  revokeShoppingShare(token: string): Observable<ShoppingShare> {
    return this.http
      .delete<ApiShoppingShare>(
        `${this.pantryShoppingSharesUrl}/${encodeURIComponent(token)}`,
        {
          withCredentials: true,
        },
      )
      .pipe(map((share) => this.normalizeShoppingShare(share)));
  }

  private normalizeProductType(productType: ApiProductType): ProductType {
    return {
      ...productType,
      defaultDepletionRule: productType.defaultDepletionRule
        ? this.normalizeDepletionRule(productType.defaultDepletionRule)
        : undefined,
      shoppingMetadata: productType.shoppingMetadata
        ? this.normalizeShoppingMetadata(productType.shoppingMetadata)
        : undefined,
      archivedAt: productType.archivedAt ? new Date(productType.archivedAt) : null,
      createdAt: new Date(productType.createdAt),
      updatedAt: new Date(productType.updatedAt),
    };
  }

  private normalizeInventoryLot(inventoryLot: ApiInventoryLot): InventoryLot {
    return {
      ...inventoryLot,
      expiresAt: inventoryLot.expiresAt ? new Date(inventoryLot.expiresAt) : null,
      purchaseDate: inventoryLot.purchaseDate
        ? new Date(inventoryLot.purchaseDate)
        : null,
      archivedAt: inventoryLot.archivedAt ? new Date(inventoryLot.archivedAt) : null,
      createdAt: new Date(inventoryLot.createdAt),
      updatedAt: new Date(inventoryLot.updatedAt),
    };
  }

  private normalizeShoppingShare(share: ApiShoppingShare): ShoppingShare {
    return {
      token: share.token,
      createdAt: new Date(share.createdAt),
      expiresAt: new Date(share.expiresAt),
      revokedAt: share.revokedAt ? new Date(share.revokedAt) : null,
    };
  }

  private normalizePublicShoppingShare(
    share: ApiPublicShoppingShare,
  ): PublicShoppingShare {
    return {
      text: share.text,
      createdAt: new Date(share.createdAt),
      expiresAt: new Date(share.expiresAt),
    };
  }

  private normalizeLotSummary(lot: ApiPantryLotSummary): PantryLotSummary {
    return {
      ...lot,
      expiresAt: lot.expiresAt ? new Date(lot.expiresAt) : null,
      purchaseDate: lot.purchaseDate ? new Date(lot.purchaseDate) : null,
      updatedAt: new Date(lot.updatedAt),
    };
  }

  private normalizePantryOverview(overview: ApiPantryOverview): PantryOverview {
    return {
      userId: overview.userId,
      generatedAt: new Date(overview.generatedAt),
      preferences: overview.preferences,
      items: overview.items.map((item) => this.normalizePantryOverviewItem(item)),
      expiringItems: overview.expiringItems.map((item) => ({
        ...item,
        nextExpirationAt: item.nextExpirationAt
          ? new Date(item.nextExpirationAt)
          : null,
        lots: item.lots.map((lot) => this.normalizeLotSummary(lot)),
      })),
      depletingItems: overview.depletingItems.map((item) =>
        this.normalizeDepletingProductGroup(item),
      ),
      shoppingPlanItems: (overview.shoppingPlanItems ?? []).map((item) =>
        this.normalizeShoppingPlanItem(item),
      ),
      shoppingPlanEstimatedTotal: overview.shoppingPlanEstimatedTotal ?? 0,
      shoppingRouteGroups: (overview.shoppingRouteGroups ?? []).map((group) =>
        this.normalizeShoppingRouteGroup(group),
      ),
      priceReferenceItems: (overview.priceReferenceItems ?? []).map((item) =>
        this.normalizePriceReferenceItem(item),
      ),
      stapleItems: (overview.stapleItems ?? []).map((item) =>
        this.normalizeStapleItem(item),
      ),
      stapleCatalogGroups: (overview.stapleCatalogGroups ?? []).map((group) =>
        this.normalizeStapleCatalogGroup(group),
      ),
      valueInsights: overview.valueInsights ?? {
        stapleCount: 0,
        stapleAttentionCount: 0,
        estimatedShoppingTotal: overview.shoppingPlanEstimatedTotal ?? 0,
        estimatedExpiringValue: 0,
        estimatedWasteAtRisk: 0,
        estimatedStapleRestockTotal: 0,
        pricedShoppingItemCount: 0,
        unpricedShoppingItemCount: 0,
        promoOnlyShoppingItemCount: 0,
        estimatedPromoOnlyTotal: 0,
      },
    };
  }

  private normalizePantryOverviewItem(item: ApiPantryOverviewItem): PantryOverviewItem {
    return {
      ...item,
      nextExpirationAt: item.nextExpirationAt ? new Date(item.nextExpirationAt) : null,
      depletionRule: item.depletionRule
        ? this.normalizeDepletionRule(item.depletionRule)
        : undefined,
      estimatedDepletionAt: item.estimatedDepletionAt
        ? new Date(item.estimatedDepletionAt)
        : undefined,
      shoppingMetadata: item.shoppingMetadata
        ? this.normalizeShoppingMetadata(item.shoppingMetadata)
        : undefined,
      lots: item.lots.map((lot) => this.normalizeLotSummary(lot)),
    };
  }

  private normalizeDepletingProductGroup(
    item: ApiDepletingProductGroup,
  ): DepletingProductGroup {
    return {
      ...item,
      estimatedDepletionAt: new Date(item.estimatedDepletionAt),
      depletionRule: this.normalizeDepletionRule(item.depletionRule),
      shoppingMetadata: item.shoppingMetadata
        ? this.normalizeShoppingMetadata(item.shoppingMetadata)
        : undefined,
    };
  }

  private normalizeShoppingPlanItem(item: ApiShoppingPlanItem): ShoppingPlanItem {
    return {
      ...item,
      estimatedDepletionAt: new Date(item.estimatedDepletionAt),
      recommendedPurchaseAt: new Date(item.recommendedPurchaseAt),
      depletionRule: this.normalizeDepletionRule(item.depletionRule),
      shoppingMetadata: item.shoppingMetadata
        ? this.normalizeShoppingMetadata(item.shoppingMetadata)
        : undefined,
    };
  }

  private normalizeShoppingRouteGroup(
    group: ApiShoppingRouteGroup,
  ): ShoppingRouteGroup {
    return {
      ...group,
      nextRecommendedPurchaseAt: new Date(group.nextRecommendedPurchaseAt),
      categoryBreakdown: (group.categoryBreakdown ?? []).map((categoryGroup) =>
        this.normalizeShoppingRouteCategoryGroup(categoryGroup),
      ),
      items: group.items.map((item) => this.normalizeShoppingPlanItem(item)),
    };
  }

  private normalizeShoppingRouteCategoryGroup(
    group: ApiShoppingRouteCategoryGroup,
  ): ShoppingRouteCategoryGroup {
    return {
      ...group,
      items: group.items.map((item) => this.normalizeShoppingPlanItem(item)),
    };
  }

  private normalizePriceReferenceItem(
    item: ApiPriceReferenceItem,
  ): PriceReferenceItem {
    return {
      ...item,
      priceHistory: (item.priceHistory ?? []).map((entry) => ({
        ...entry,
        recordedAt: new Date(entry.recordedAt),
      })),
      updatedAt: new Date(item.updatedAt),
    };
  }

  private normalizeStapleItem(item: ApiPantryStapleItem): PantryStapleItem {
    return {
      ...item,
      shoppingMetadata: item.shoppingMetadata
        ? this.normalizeShoppingMetadata(item.shoppingMetadata)
        : undefined,
    };
  }

  private normalizeStapleCatalogGroup(
    group: ApiPantryStapleCatalogGroup,
  ): PantryStapleCatalogGroup {
    return {
      ...group,
      items: group.items.map((item) => this.normalizeStapleItem(item)),
    };
  }

  private normalizeDepletionRule(
    rule: ApiProductTypeDepletionRule,
  ): ProductTypeDepletionRule {
    return {
      ...rule,
      anchorDate: new Date(rule.anchorDate),
    };
  }

  private normalizeShoppingMetadata(
    metadata: Partial<ProductTypeShoppingMetadata>,
  ): ProductTypeShoppingMetadata {
    const normalized: ProductTypeShoppingMetadata = {
      ...metadata,
      householdStaple: metadata.householdStaple ?? false,
      buyOnlyOnPromo: metadata.buyOnlyOnPromo ?? false,
    };

    if (metadata.priceHistory) {
      normalized.priceHistory = metadata.priceHistory.map((entry) => ({
        ...entry,
        recordedAt: new Date(entry.recordedAt),
      }));
    }

    return normalized;
  }
}
