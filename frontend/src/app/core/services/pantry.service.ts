import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ApiInventoryLot,
  ApiDepletingProductGroup,
  ApiPantryLotSummary,
  ApiPantryOverview,
  ApiPantryOverviewItem,
  ApiProductType,
  ApiProductTypeDepletionRule,
  ApiShoppingPlanItem,
  ConsumeInventoryLotRequest,
  CreateInventoryLotRequest,
  CreateProductTypeRequest,
  DepletingProductGroup,
  InventoryLot,
  PantryLotSummary,
  PantryOverview,
  PantryOverviewItem,
  ProductTypeDepletionRule,
  ProductTypeDepletionRuleRequest,
  ProductType,
  RegisterLotRequest,
  ShoppingPlanItem,
} from '../../shared/models/pantry.model';

@Injectable({
  providedIn: 'root',
})
export class PantryService {
  private readonly apiUrl = environment.apiUrl;
  private readonly productTypesUrl = `${this.apiUrl}/product-types`;
  private readonly inventoryLotsUrl = `${this.apiUrl}/inventory-lots`;
  private readonly pantryOverviewUrl = `${this.apiUrl}/pantry/overview`;

  constructor(private readonly http: HttpClient) {}

  getPantryOverview(): Observable<PantryOverview> {
    return this.http
      .get<ApiPantryOverview>(this.pantryOverviewUrl)
      .pipe(map((overview) => this.normalizePantryOverview(overview)));
  }

  searchProductTypes(search: string): Observable<ProductType[]> {
    return this.http
      .get<ApiProductType[]>(this.productTypesUrl, {
        params: { search },
      })
      .pipe(
        map((productTypes) =>
          productTypes.map((productType) => this.normalizeProductType(productType)),
        ),
      );
  }

  createProductType(request: CreateProductTypeRequest): Observable<ProductType> {
    return this.http
      .post<ApiProductType>(this.productTypesUrl, request)
      .pipe(map((productType) => this.normalizeProductType(productType)));
  }

  updateProductTypeDepletionRule(
    productTypeId: string,
    defaultDepletionRule: ProductTypeDepletionRuleRequest,
  ): Observable<ProductType> {
    return this.http
      .patch<ApiProductType>(`${this.productTypesUrl}/${productTypeId}/depletion-rule`, {
        defaultDepletionRule,
      })
      .pipe(map((productType) => this.normalizeProductType(productType)));
  }

  createInventoryLot(request: CreateInventoryLotRequest): Observable<InventoryLot> {
    return this.http
      .post<ApiInventoryLot>(this.inventoryLotsUrl, request)
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
      .post<ApiInventoryLot | null>(`${this.inventoryLotsUrl}/${lotId}/consume`, request)
      .pipe(
        map((inventoryLot) =>
          inventoryLot ? this.normalizeInventoryLot(inventoryLot) : null,
        ),
      );
  }

  private normalizeProductType(productType: ApiProductType): ProductType {
    return {
      ...productType,
      defaultDepletionRule: productType.defaultDepletionRule
        ? this.normalizeDepletionRule(productType.defaultDepletionRule)
        : undefined,
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
      createdAt: new Date(inventoryLot.createdAt),
      updatedAt: new Date(inventoryLot.updatedAt),
    };
  }

  private normalizeLotSummary(lot: ApiPantryLotSummary): PantryLotSummary {
    return {
      ...lot,
      expiresAt: lot.expiresAt ? new Date(lot.expiresAt) : null,
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
    };
  }

  private normalizeShoppingPlanItem(item: ApiShoppingPlanItem): ShoppingPlanItem {
    return {
      ...item,
      estimatedDepletionAt: new Date(item.estimatedDepletionAt),
      recommendedPurchaseAt: new Date(item.recommendedPurchaseAt),
      depletionRule: this.normalizeDepletionRule(item.depletionRule),
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
}
