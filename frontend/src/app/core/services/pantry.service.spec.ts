import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PantryService } from './pantry.service';
import { environment } from '../../../environments/environment';

describe('PantryService', () => {
  let service: PantryService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    service = TestBed.inject(PantryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('normalizes shopping plan dates from pantry overview responses', () => {
    service.getPantryOverview().subscribe((overview) => {
      expect(overview.shoppingPlanItems).toHaveSize(1);
      expect((overview as any).shoppingPlanEstimatedTotal).toBe(42.5);
      expect((overview.items[0] as any).shoppingMetadata).toEqual({
        storageLocation: 'Limpieza',
        shoppingLocation: 'Mayoreo',
        preferredBrand: 'Marca hogar',
        substituteBrand: 'Marca propia',
        buyOnlyOnPromo: true,
        shoppingNotes: 'Comprar solo si hay promo',
        estimatedUnitPrice: 42.5,
      });
      expect((overview.shoppingPlanItems[0] as any).estimatedLineTotal).toBe(42.5);
      expect(overview.shoppingPlanItems[0].recommendedPurchaseAt).toEqual(
        new Date('2026-04-28T00:00:00.000Z'),
      );
      expect(overview.shoppingPlanItems[0].estimatedDepletionAt).toEqual(
        new Date('2026-05-01T00:00:00.000Z'),
      );
    });

    const request = httpMock.expectOne(`${environment.apiUrl}/pantry/overview`);
    request.flush({
      userId: 'tester',
      generatedAt: '2026-04-24T12:00:00.000Z',
      preferences: {
        expirationWarningDays: 7,
        showExpiredEntryAlert: true,
        depletionWarningThresholdRatio: 1,
        shoppingPlanLeadDays: 3,
        showGuidanceTips: true,
      },
      items: [
        {
          productTypeId: 'type-detergent',
          baseName: 'Detergente',
          category: 'cleaning',
          defaultUnit: 'lt',
          totalQuantity: 1,
          lotCount: 1,
          nextExpirationAt: null,
          expiringSoonQuantity: 0,
          hasDepletionRule: true,
          depletionRule: {
            enabled: true,
            consumeAmount: 1,
            unit: 'lt',
            everyAmount: 1,
            everyPeriod: 'month',
            anchorDate: '2026-03-24T00:00:00.000Z',
          },
          effectivePlanningSettings: makeEffectivePlanningSettings(),
          shoppingMetadata: {
            storageLocation: 'Limpieza',
            shoppingLocation: 'Mayoreo',
            preferredBrand: 'Marca hogar',
            substituteBrand: 'Marca propia',
            buyOnlyOnPromo: true,
            shoppingNotes: 'Comprar solo si hay promo',
            estimatedUnitPrice: 42.5,
          },
          estimatedCurrentQuantity: 0,
          estimatedConsumedQuantity: 1,
          estimatedDepletionAt: '2026-04-24T00:00:00.000Z',
          variants: ['Marca hogar'],
          lots: [
            {
              lotId: 'lot-1',
              variantName: 'Marca hogar',
              quantity: 1,
              unit: 'lt',
              expiresAt: null,
              purchaseDate: '2026-03-24T00:00:00.000Z',
              expirationStatus: 'none',
              updatedAt: '2026-04-24T00:00:00.000Z',
            },
          ],
        },
      ],
      expiringItems: [],
      depletingItems: [],
      shoppingPlanItems: [
        {
          productTypeId: 'type-detergent',
          baseName: 'Detergente',
          category: 'cleaning',
          defaultUnit: 'lt',
          totalQuantity: 2,
          estimatedCurrentQuantity: 1,
          estimatedConsumedQuantity: 1,
          estimatedDepletionAt: '2026-05-01T00:00:00.000Z',
          recommendedPurchaseAt: '2026-04-28T00:00:00.000Z',
          suggestedPurchaseQuantity: 1,
          estimatedUnitPrice: 42.5,
          estimatedLineTotal: 42.5,
          shoppingMetadata: {
            storageLocation: 'Limpieza',
            shoppingLocation: 'Mayoreo',
            preferredBrand: 'Marca hogar',
            substituteBrand: 'Marca propia',
            buyOnlyOnPromo: true,
            shoppingNotes: 'Comprar solo si hay promo',
            estimatedUnitPrice: 42.5,
          },
          urgency: 'upcoming',
          effectivePlanningSettings: makeEffectivePlanningSettings(),
          depletionRule: {
            enabled: true,
            consumeAmount: 1,
            unit: 'lt',
            everyAmount: 1,
            everyPeriod: 'week',
            anchorDate: '2026-04-17T00:00:00.000Z',
          },
        },
      ],
      shoppingPlanEstimatedTotal: 42.5,
    });
  });

  it('sends shopping metadata when registering a new product type', () => {
    service
      .registerLot({
        selectionMode: 'new',
        newProductType: {
          baseName: 'Frijol negro',
          category: 'food',
          defaultUnit: 'kg',
          shoppingMetadata: {
            storageLocation: 'Despensa',
            shoppingLocation: 'Mercado',
            preferredBrand: 'Marca local',
            substituteBrand: 'Marca propia',
            buyOnlyOnPromo: true,
            shoppingNotes: 'Comprar bolsa grande si esta en promo',
            estimatedUnitPrice: 36.5,
          },
        },
        quantity: 2,
        unit: 'kg',
      } as any)
      .subscribe();

    const productTypeRequest = httpMock.expectOne(
      `${environment.apiUrl}/product-types`,
    );
    expect(productTypeRequest.request.body.shoppingMetadata).toEqual({
      storageLocation: 'Despensa',
      shoppingLocation: 'Mercado',
      preferredBrand: 'Marca local',
      substituteBrand: 'Marca propia',
      buyOnlyOnPromo: true,
      shoppingNotes: 'Comprar bolsa grande si esta en promo',
      estimatedUnitPrice: 36.5,
    });
    productTypeRequest.flush({
      ...makeApiProductType(),
      id: 'type-frijol',
      baseName: 'Frijol negro',
      category: 'food',
      defaultUnit: 'kg',
      shoppingMetadata: {
        storageLocation: 'Despensa',
        shoppingLocation: 'Mercado',
        preferredBrand: 'Marca local',
        substituteBrand: 'Marca propia',
        buyOnlyOnPromo: true,
        shoppingNotes: 'Comprar bolsa grande si esta en promo',
        estimatedUnitPrice: 36.5,
      },
    });

    httpMock.expectOne(`${environment.apiUrl}/inventory-lots`).flush({
      id: 'lot-1',
      userId: 'tester',
      productTypeId: 'type-frijol',
      quantity: 2,
      unit: 'kg',
      expiresAt: null,
      purchaseDate: null,
      archivedAt: null,
      expirationStatus: 'none',
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
    });
  });

  it('normalizes product type planning and archive responses', () => {
    service.searchProductTypes('detergente').subscribe((productTypes) => {
      expect(productTypes[0].planningSettings).toEqual({
        planningEnabled: true,
        shoppingPlanLeadDaysOverride: 6,
      });
      expect(productTypes[0].archivedAt).toEqual(
        new Date('2026-04-24T00:00:00.000Z'),
      );
    });

    const request = httpMock.expectOne(
      `${environment.apiUrl}/product-types?search=detergente`,
    );
    request.flush([
      {
        id: 'type-detergent',
        userId: 'tester',
        baseName: 'Detergente',
        category: 'cleaning',
        defaultUnit: 'lt',
        planningSettings: {
          planningEnabled: true,
          shoppingPlanLeadDaysOverride: 6,
        },
        archivedAt: '2026-04-24T00:00:00.000Z',
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-24T00:00:00.000Z',
      },
    ]);
  });

  it('calls archive, restore, delete, and archived item endpoints', () => {
    service.archiveProductType('type-1', { reason: 'No comprar mas' }).subscribe();
    httpMock
      .expectOne(`${environment.apiUrl}/product-types/type-1/archive`)
      .flush(makeApiProductType());

    service.restoreProductType('type-1').subscribe();
    httpMock
      .expectOne(`${environment.apiUrl}/product-types/type-1/restore`)
      .flush(makeApiProductType());

    service
      .deleteInventoryLot('lot-1', { confirmationText: 'Lote lot-1' })
      .subscribe();
    const deleteRequest = httpMock.expectOne(
      `${environment.apiUrl}/inventory-lots/lot-1`,
    );
    expect(deleteRequest.request.method).toBe('DELETE');
    expect(deleteRequest.request.body).toEqual({
      confirmationText: 'Lote lot-1',
    });
    deleteRequest.flush(null);

    service.getArchivedPantryItems().subscribe((archivedItems) => {
      expect(archivedItems.productTypes[0].id).toBe('type-1');
      expect(archivedItems.inventoryLots[0].purchaseDate).toEqual(
        new Date('2026-04-01T00:00:00.000Z'),
      );
    });
    httpMock.expectOne(`${environment.apiUrl}/pantry/archived`).flush({
      productTypes: [makeApiProductType()],
      inventoryLots: [
        {
          id: 'lot-1',
          userId: 'tester',
          productTypeId: 'type-1',
          variantName: 'Botella grande',
          quantity: 1,
          unit: 'lt',
          expiresAt: null,
          purchaseDate: '2026-04-01T00:00:00.000Z',
          archivedAt: '2026-04-24T00:00:00.000Z',
          expirationStatus: 'none',
          createdAt: '2026-04-01T00:00:00.000Z',
          updatedAt: '2026-04-24T00:00:00.000Z',
        },
      ],
    });
  });
});

function makeEffectivePlanningSettings() {
  return {
    planningEnabled: true,
    expirationWarningDays: 7,
    depletionWarningThresholdRatio: 1,
    shoppingPlanLeadDays: 3,
    expirationWarningDaysSource: 'profile',
    depletionWarningThresholdRatioSource: 'profile',
    shoppingPlanLeadDaysSource: 'profile',
  };
}

function makeApiProductType() {
  return {
    id: 'type-1',
    userId: 'tester',
    baseName: 'Detergente',
    category: 'cleaning',
    defaultUnit: 'lt',
    planningSettings: {
      planningEnabled: true,
    },
    archivedAt: '2026-04-24T00:00:00.000Z',
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-24T00:00:00.000Z',
  };
}
