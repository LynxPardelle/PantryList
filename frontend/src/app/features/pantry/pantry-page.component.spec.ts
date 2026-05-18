import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { NEVER, of, Subject } from 'rxjs';
import { Store } from '@ngrx/store';
import { AuthFacade } from '../../core/services/auth.facade';
import { PantryPageComponent } from './pantry-page.component';
import { PantryService } from '../../core/services/pantry.service';
import {
  InventoryLot,
  PantryLotSummary,
  PantryOverviewItem,
  PantryStapleItem,
  ProductType,
  ShoppingPlanItem,
} from '../../shared/models/pantry.model';
import {
  selectExpiredEntryAlert,
  selectShoppingPlanItems,
} from '../../store/pantry/pantry.selectors';

describe('PantryPageComponent', () => {
  let fixture: ComponentFixture<PantryPageComponent>;
  let component: PantryPageComponent;
  let pantryService: jasmine.SpyObj<PantryService>;
  let authFacade: AuthFacadeStub;
  let store: { select: jasmine.Spy; dispatch: jasmine.Spy };

  beforeEach(async () => {
    pantryService = jasmine.createSpyObj<PantryService>('PantryService', [
      'searchProductTypes',
      'registerLot',
      'consumeInventoryLot',
      'updateProductTypeDepletionRule',
      'updateProductTypePlanningSettings',
      'updateProductTypeShoppingMetadata',
      'archiveProductType',
      'restoreProductType',
      'deleteProductType',
      'archiveInventoryLot',
      'restoreInventoryLot',
      'deleteInventoryLot',
      'getArchivedPantryItems',
    ]);
    pantryService.searchProductTypes.and.returnValue(of([]));
    pantryService.registerLot.and.returnValue(of({} as any));
    pantryService.consumeInventoryLot.and.returnValue(of(null));
    pantryService.updateProductTypeDepletionRule.and.returnValue(of({} as any));
    pantryService.updateProductTypePlanningSettings.and.returnValue(of({} as any));
    pantryService.updateProductTypeShoppingMetadata.and.returnValue(of({} as any));
    pantryService.archiveProductType.and.returnValue(of({} as any));
    pantryService.restoreProductType.and.returnValue(of({} as any));
    pantryService.deleteProductType.and.returnValue(of(undefined));
    pantryService.archiveInventoryLot.and.returnValue(of({} as any));
    pantryService.restoreInventoryLot.and.returnValue(of({} as any));
    pantryService.deleteInventoryLot.and.returnValue(of(undefined));
    pantryService.getArchivedPantryItems.and.returnValue(
      of({ productTypes: [], inventoryLots: [] }),
    );
    authFacade = new AuthFacadeStub();
    store = {
      select: jasmine.createSpy('select').and.returnValue(of(null)),
      dispatch: jasmine.createSpy('dispatch'),
    };

    await TestBed.configureTestingModule({
      declarations: [PantryPageComponent],
      imports: [
        HttpClientTestingModule,
        ReactiveFormsModule,
        RouterTestingModule,
      ],
      providers: [
        {
          provide: PantryService,
          useValue: pantryService,
        },
        {
          provide: AuthFacade,
          useValue: authFacade,
        },
        {
          provide: Store,
          useValue: store,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PantryPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('resets the unit when switching from an existing type to a new type', () => {
    const existingType: ProductType = {
      id: 'type-1',
      userId: 'tester',
      baseName: 'Atun',
      category: 'food',
      defaultUnit: 'kg',
      planningSettings: {
        planningEnabled: true,
      },
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    component.selectExistingProductType(existingType);
    component.setSelectionMode('new');

    expect(component.selectedExistingType).toBeNull();
    expect(component.lotForm.controls.unit.value).toBe('piezas');
  });

  it('prevents a second consume request while one is already in flight', () => {
    const pendingRequest = new Subject<null>();
    pantryService.consumeInventoryLot.and.returnValue(pendingRequest);

    component.consumeLot('lot-1', 1);
    component.consumeLot('lot-2', 1);

    expect(pantryService.consumeInventoryLot.calls.count()).toBe(1);
    expect(pantryService.consumeInventoryLot.calls.argsFor(0)).toEqual([
      'lot-1',
      {
        quantity: 1,
      },
    ]);
  });

  it('renders an explicit label for the existing type search input', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const label = compiled.querySelector('label[for="existingTypeSearch"]');
    const input = compiled.querySelector<HTMLInputElement>('#existingTypeSearch');

    expect(label?.textContent).toContain('Busca el tipo base');
    expect(input).not.toBeNull();
  });

  it('shows a neutral lot unit preview until an existing type is selected', () => {
    component.setSelectionMode('existing');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const unitPreview = compiled.querySelector<HTMLInputElement>(
      '#lotUnitPreview',
    );

    expect(unitPreview?.value).toBe('Selecciona un tipo base');
  });

  it('includes a product type depletion rule when registering a new durable product', () => {
    component.setSelectionMode('new');
    component.lotForm.patchValue({
      newBaseName: 'Detergente liquido',
      category: 'cleaning',
      unit: 'lt',
      quantity: 3,
      enableDurability: true,
      depletionConsumeAmount: 1,
      depletionEveryAmount: 1,
      depletionEveryPeriod: 'month',
      depletionAnchorDate: '2026-04-24',
    } as any);

    component.submitLot();

    expect(pantryService.registerLot).toHaveBeenCalledWith(
      jasmine.objectContaining({
        newProductType: jasmine.objectContaining({
          defaultDepletionRule: {
            enabled: true,
            consumeAmount: 1,
            unit: 'lt',
            everyAmount: 1,
            everyPeriod: 'month',
            anchorDate: '2026-04-24',
          },
        }),
      }),
    );
  });

  it('includes LatAm shopping metadata when registering a new product type', () => {
    component.setSelectionMode('new');
    component.lotForm.patchValue({
      newBaseName: 'Frijol negro',
      category: 'food',
      unit: 'kg',
      quantity: 2,
      storageLocation: 'Despensa',
      shoppingLocation: 'Mercado',
      preferredBrand: 'Marca local',
      substituteBrand: 'Marca propia',
      householdStaple: true,
      buyOnlyOnPromo: true,
      shoppingNotes: 'Comprar bolsa grande si esta en promo',
      estimatedUnitPrice: 36.5,
    } as any);

    component.submitLot();

    expect(pantryService.registerLot).toHaveBeenCalledWith(
      jasmine.objectContaining({
        newProductType: jasmine.objectContaining({
          shoppingMetadata: {
            storageLocation: 'Despensa',
            shoppingLocation: 'Mercado',
            preferredBrand: 'Marca local',
            substituteBrand: 'Marca propia',
            householdStaple: true,
            buyOnlyOnPromo: true,
            shoppingNotes: 'Comprar bolsa grande si esta en promo',
            estimatedUnitPrice: 36.5,
          },
        }),
      }),
    );
  });

  it('releases the register button when lot registration times out', fakeAsync(() => {
    pantryService.registerLot.and.returnValue(NEVER);
    component.setSelectionMode('new');
    component.lotForm.patchValue({
      newBaseName: 'QA Codex arroz',
      category: 'food',
      unit: 'piezas',
      quantity: 1,
    } as any);

    component.submitLot();

    expect(component.submittingLot).toBeTrue();

    tick(15001);

    expect(component.submittingLot).toBeFalse();
    expect(component.registerError).toBe(
      'La solicitud tardo demasiado. Revisa tu conexion e intenta de nuevo.',
    );
  }));

  it('opens a product type depletion rule editor with the current rule values', () => {
    const group = makePantryGroup({
      defaultUnit: 'lt',
      depletionRule: {
        enabled: true,
        consumeAmount: 0.5,
        unit: 'lt',
        everyAmount: 2,
        everyPeriod: 'month',
        anchorDate: new Date('2026-04-24T00:00:00.000Z'),
      },
    });

    component.startEditingDepletionRule(group);

    expect(component.editingDepletionProductTypeId).toBe('type-detergent');
    expect(component.depletionRuleForm.getRawValue()).toEqual({
      enabled: true,
      consumeAmount: 0.5,
      everyAmount: 2,
      everyPeriod: 'month',
      anchorDate: '2026-04-24',
    });
  });

  it('saves edited product type depletion rules and reloads the pantry overview', () => {
    const group = makePantryGroup({ defaultUnit: 'lt' });
    component.startEditingDepletionRule(group);
    component.depletionRuleForm.patchValue({
      enabled: true,
      consumeAmount: 0.75,
      everyAmount: 3,
      everyPeriod: 'week',
      anchorDate: '2026-05-01',
    });

    component.saveDepletionRule(group);

    expect(pantryService.updateProductTypeDepletionRule).toHaveBeenCalledWith(
      'type-detergent',
      {
        enabled: true,
        consumeAmount: 0.75,
        unit: 'lt',
        everyAmount: 3,
        everyPeriod: 'week',
        anchorDate: '2026-05-01',
      },
    );
    expect(component.editingDepletionProductTypeId).toBeNull();
    expect(store.dispatch).toHaveBeenCalled();
  });

  it('shows and dismisses the expired entry alert for the current pantry visit', async () => {
    store.select.and.callFake((selector) => {
      if (selector === selectExpiredEntryAlert) {
        return of({
          expiredLotCount: 2,
          expiredQuantity: 3,
        });
      }

      return of(null);
    });
    fixture = TestBed.createComponent(PantryPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    let compiled = fixture.nativeElement as HTMLElement;
    const alert = compiled.querySelector('[data-testid="expired-entry-alert"]');
    expect(alert?.textContent).toContain('Hay productos que ya caducaron');
    expect(alert?.textContent).toContain('2 lotes');

    compiled
      .querySelector<HTMLButtonElement>('[data-testid="dismiss-expired-alert"]')
      ?.click();
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;

    expect(
      compiled.querySelector('[data-testid="expired-entry-alert"]'),
    ).toBeNull();
  });

  it('separates expired quantity from upcoming expiration quantity for a base type', () => {
    const group = makePantryGroup({
      lots: [
        {
          lotId: 'lot-expired',
          quantity: 3,
          unit: 'piezas',
          expiresAt: new Date('2026-04-23T00:00:00.000Z'),
          purchaseDate: null,
          expirationStatus: 'expired',
          updatedAt: new Date('2026-04-23T00:00:00.000Z'),
        },
        {
          lotId: 'lot-critical',
          quantity: 1,
          unit: 'piezas',
          expiresAt: new Date('2026-04-29T00:00:00.000Z'),
          purchaseDate: null,
          expirationStatus: 'critical',
          updatedAt: new Date('2026-04-23T00:00:00.000Z'),
        },
        {
          lotId: 'lot-stable',
          quantity: 8,
          unit: 'piezas',
          expiresAt: new Date('2026-05-30T00:00:00.000Z'),
          purchaseDate: null,
          expirationStatus: 'stable',
          updatedAt: new Date('2026-04-23T00:00:00.000Z'),
        },
      ],
    });

    expect(component.getExpiredQuantity(group)).toBe(3);
    expect(component.getPendingExpirationQuantity(group)).toBe(1);
  });

  it('formats one piece in singular Spanish for pantry quantities', () => {
    expect(component.formatQuantity(1, 'piezas')).toBe('1 pieza');
    expect(component.formatQuantity(2, 'piezas')).toBe('2 piezas');
  });

  it('uses action-oriented shopping labels', () => {
    expect(component.shoppingPlanUrgencyLabels.depleted).toBe('Comprar ya');
    expect(component.shoppingPlanUrgencyLabels.critical).toBe(
      'Comprar esta semana',
    );
    expect(component.shoppingPlanUrgencyLabels.upcoming).toBe('Comprar pronto');
  });

  it('builds a WhatsApp-friendly shopping export with budget and LatAm metadata', () => {
    const exportText = component.buildShoppingPlanExportText([
      {
        productTypeId: 'type-detergent',
        baseName: 'Detergente',
        category: 'cleaning',
        defaultUnit: 'lt',
        totalQuantity: 3,
        estimatedCurrentQuantity: 1,
        estimatedConsumedQuantity: 2,
        estimatedDepletionAt: new Date('2026-05-01T00:00:00.000Z'),
        recommendedPurchaseAt: new Date('2026-04-28T00:00:00.000Z'),
        suggestedPurchaseQuantity: 1,
        urgency: 'critical',
        estimatedUnitPrice: 42.5,
        estimatedLineTotal: 42.5,
        shoppingMetadata: {
          storageLocation: 'Limpieza',
          shoppingLocation: 'Mayoreo',
          preferredBrand: 'Marca hogar',
          substituteBrand: 'Marca propia',
          householdStaple: true,
          buyOnlyOnPromo: true,
          shoppingNotes: 'Comprar solo si hay promo',
          estimatedUnitPrice: 42.5,
        },
        effectivePlanningSettings: makePantryGroup().effectivePlanningSettings,
        depletionRule: {
          enabled: true,
          consumeAmount: 1,
          unit: 'lt',
          everyAmount: 1,
          everyPeriod: 'week',
          anchorDate: new Date('2026-04-17T00:00:00.000Z'),
        },
      } as ShoppingPlanItem,
    ]);

    expect(exportText).toContain('Lista de compras PantryList');
    expect(exportText).toContain('Total estimado: 42.50 moneda local');
    expect(exportText).toContain('Mayoreo:');
    expect(exportText).toContain('Subtotal ruta: 42.50 moneda local');
    expect(exportText).toContain('- Detergente: 1 lt');
    expect(exportText).toContain('Marca: Marca hogar');
    expect(exportText).toContain('Solo promo');
    expect(exportText).toContain('Nota: Comprar solo si hay promo');
    expect((component as any).getWhatsAppShoppingUrl(exportText)).toBe(
      `https://wa.me/?text=${encodeURIComponent(exportText)}`,
    );
  });

  it('compares the smart basket against a stored household budget', () => {
    (component as any).saveShoppingBudget(800);

    expect((component as any).shoppingBudget).toBe(800);
    expect((component as any).getBudgetStatusLabel(650)).toBe(
      'Dentro del presupuesto: quedan 150.00 moneda local',
    );
    expect((component as any).getBudgetStatusLabel(925)).toBe(
      'Sobre presupuesto por 125.00 moneda local',
    );
  });

  it('parses quick capture lines for offline purchase drafts', () => {
    const parsed = (component as any).parseQuickCaptureText(
      'Arroz | 2 kg | Mercado | 35\nShampoo | 1 botella | Farmacia',
    );

    expect(parsed).toEqual([
      {
        name: 'Arroz',
        quantity: 2,
        unit: 'kg',
        shoppingLocation: 'Mercado',
        estimatedUnitPrice: 35,
      },
      {
        name: 'Shampoo',
        quantity: 1,
        unit: 'botella',
        shoppingLocation: 'Farmacia',
        estimatedUnitPrice: undefined,
      },
    ]);
  });

  it('summarizes household staple attention and restock estimates', () => {
    const stapleItems: PantryStapleItem[] = [
      {
        productTypeId: 'type-rice',
        baseName: 'Arroz',
        category: 'food',
        defaultUnit: 'kg',
        totalQuantity: 1,
        suggestedPurchaseQuantity: 2,
        estimatedRestockTotal: 60,
        status: 'low',
      },
      {
        productTypeId: 'type-detergent',
        baseName: 'Detergente',
        category: 'cleaning',
        defaultUnit: 'lt',
        totalQuantity: 3,
        suggestedPurchaseQuantity: 1,
        status: 'available',
      },
    ];

    expect(component.getStapleAttentionSummary([...stapleItems])).toBe(
      '1 de 2 básicos por revisar',
    );
    expect(component.getStapleRestockSummary([...stapleItems])).toBe(
      'Reposición estimada: 60.00 moneda local',
    );
  });

  it('marks shopping totals as partial when any suggested item has no price estimate', () => {
    const exportText = component.buildShoppingPlanExportText([
      makeShoppingPlanItem({
        baseName: 'Detergente',
        estimatedUnitPrice: 42.5,
        estimatedLineTotal: 42.5,
      }),
      makeShoppingPlanItem({
        productTypeId: 'type-rice',
        baseName: 'Arroz',
        defaultUnit: 'kg',
        estimatedUnitPrice: undefined,
        estimatedLineTotal: undefined,
      }),
    ]);

    expect(component.getShoppingPlanTotalLabel([
      makeShoppingPlanItem({ estimatedLineTotal: 42.5 }),
      makeShoppingPlanItem({
        productTypeId: 'type-rice',
        estimatedLineTotal: undefined,
      }),
    ])).toBe('Total parcial estimado');
    expect(exportText).toContain('Total parcial estimado: 42.50 moneda local');
  });

  it('does not call an unpriced shopping plan a partial total', () => {
    expect(
      component.getShoppingPlanTotalSummary([
        makeShoppingPlanItem({
          estimatedUnitPrice: undefined,
          estimatedLineTotal: undefined,
        }),
      ]),
    ).toBe('Sin precios estimados');
  });

  it('renders an accessible name for the manual shopping export textarea', async () => {
    store.select.and.callFake((selector) => {
      if (selector === selectShoppingPlanItems) {
        return of([makeShoppingPlanItem()]);
      }

      return of(null);
    });
    fixture = TestBed.createComponent(PantryPageComponent);
    component = fixture.componentInstance;
    component.shoppingExportText = 'Lista generada';
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const textarea = compiled.querySelector<HTMLTextAreaElement>(
      '.shopping-export-text',
    );

    expect(textarea?.getAttribute('aria-label')).toBe(
      'Lista de compras generada',
    );
  });

  it('saves product type planning overrides and reloads the pantry overview', () => {
    const group = makePantryGroup();
    component.startEditingPlanningSettings(group);
    component.planningSettingsForm.patchValue({
      planningEnabled: true,
      expirationWarningDaysOverride: 14,
      depletionWarningThresholdRatioOverride: 0.75,
      shoppingPlanLeadDaysOverride: 6,
    });

    component.savePlanningSettings(group);

    expect(pantryService.updateProductTypePlanningSettings).toHaveBeenCalledWith(
      'type-detergent',
      {
        planningEnabled: true,
        expirationWarningDaysOverride: 14,
        depletionWarningThresholdRatioOverride: 0.75,
        shoppingPlanLeadDaysOverride: 6,
      },
    );
    expect(component.editingPlanningProductTypeId).toBeNull();
    expect(store.dispatch).toHaveBeenCalled();
  });

  it('loads archived pantry items when the archived panel is opened', () => {
    component.toggleArchivedPanel();

    expect(pantryService.getArchivedPantryItems).toHaveBeenCalled();
    expect(component.archivedPanelOpen).toBeTrue();
    expect(component.archivedItems).toEqual({
      productTypes: [],
      inventoryLots: [],
    });
  });

  it('requires inline confirmation before archiving a product type', () => {
    const group = makePantryGroup();

    component.archiveProductType(group);

    expect(component.archiveConfirmationTarget).toEqual({
      kind: 'productType',
      id: 'type-detergent',
      label: 'Detergente',
      message:
        'Se quitara de la despensa activa, busquedas y compras sugeridas. Sus lotes activos tambien dejaran de contarse.',
    });
    expect(pantryService.archiveProductType).not.toHaveBeenCalled();

    component.confirmArchiveConfirmation();

    expect(pantryService.archiveProductType).toHaveBeenCalledWith(
      'type-detergent',
      { reason: 'Archivado desde la despensa' },
    );
    expect(component.archiveConfirmationTarget).toBeNull();
  });

  it('requires inline confirmation before archiving an inventory lot', () => {
    const lot = makePantryLotSummary();

    component.archiveLot(lot);
    component.confirmArchiveConfirmation();

    expect(pantryService.archiveInventoryLot).toHaveBeenCalledWith('lot-1', {
      reason: 'Archivado desde la despensa',
    });
    expect(component.archiveConfirmationTarget).toBeNull();
  });

  it('requires inline confirmation before permanently deleting an archived product type', () => {
    const productType = makeProductType();

    component.deleteArchivedProductType(productType);

    expect(component.deleteConfirmationTarget).toEqual({
      kind: 'productType',
      id: 'type-detergent',
      expectedText: 'Detergente',
    });
    expect(pantryService.deleteProductType).not.toHaveBeenCalled();

    component.updateDeleteConfirmationInput('Detergente equivocado');
    component.confirmDeleteConfirmation();

    expect(component.deleteConfirmationError).toContain('Detergente');
    expect(pantryService.deleteProductType).not.toHaveBeenCalled();

    component.updateDeleteConfirmationInput('Detergente');
    component.confirmDeleteConfirmation();

    expect(pantryService.deleteProductType).toHaveBeenCalledWith(
      'type-detergent',
      { confirmationText: 'Detergente' },
    );
    expect(component.deleteConfirmationTarget).toBeNull();
  });

  it('requires inline confirmation before permanently deleting an archived inventory lot', () => {
    const inventoryLot = makeInventoryLot();

    component.deleteArchivedInventoryLot(inventoryLot);
    component.updateDeleteConfirmationInput('Lote familiar');
    component.confirmDeleteConfirmation();

    expect(pantryService.deleteInventoryLot).toHaveBeenCalledWith('lot-1', {
      confirmationText: 'Lote familiar',
    });
    expect(component.deleteConfirmationTarget).toBeNull();
  });
});

class AuthFacadeStub {
  readonly currentUsername$ = of('tester');

  logout(): void {
    // no-op
  }
}

function makePantryGroup(
  overrides: Partial<PantryOverviewItem> = {},
): PantryOverviewItem {
  return {
    productTypeId: 'type-detergent',
    baseName: 'Detergente',
    category: 'cleaning',
    defaultUnit: 'lt',
    totalQuantity: 3,
    lotCount: 1,
    nextExpirationAt: null,
    expiringSoonQuantity: 0,
    hasDepletionRule: Boolean(overrides.depletionRule),
    effectivePlanningSettings: {
      planningEnabled: true,
      expirationWarningDays: 7,
      depletionWarningThresholdRatio: 1,
      shoppingPlanLeadDays: 3,
      expirationWarningDaysSource: 'profile',
      depletionWarningThresholdRatioSource: 'profile',
      shoppingPlanLeadDaysSource: 'profile',
    },
    variants: [],
    lots: [],
    ...overrides,
  };
}

function makePantryLotSummary(
  overrides: Partial<PantryLotSummary> = {},
): PantryLotSummary {
  return {
    lotId: 'lot-1',
    variantName: 'Lote familiar',
    quantity: 1,
    unit: 'piezas',
    expiresAt: null,
    purchaseDate: null,
    expirationStatus: 'none',
    updatedAt: new Date('2026-05-16T12:00:00.000Z'),
    ...overrides,
  };
}

function makeProductType(overrides: Partial<ProductType> = {}): ProductType {
  return {
    id: 'type-detergent',
    userId: 'user-1',
    baseName: 'Detergente',
    category: 'cleaning',
    defaultUnit: 'lt',
    planningSettings: {
      planningEnabled: true,
    },
    archivedAt: new Date('2026-05-16T12:00:00.000Z'),
    createdAt: new Date('2026-05-01T12:00:00.000Z'),
    updatedAt: new Date('2026-05-16T12:00:00.000Z'),
    ...overrides,
  };
}

function makeInventoryLot(overrides: Partial<InventoryLot> = {}): InventoryLot {
  return {
    id: 'lot-1',
    userId: 'user-1',
    productTypeId: 'type-detergent',
    variantName: 'Lote familiar',
    quantity: 1,
    unit: 'piezas',
    expiresAt: null,
    purchaseDate: null,
    archivedAt: new Date('2026-05-16T12:00:00.000Z'),
    expirationStatus: 'none',
    createdAt: new Date('2026-05-01T12:00:00.000Z'),
    updatedAt: new Date('2026-05-16T12:00:00.000Z'),
    ...overrides,
  };
}

function makeShoppingPlanItem(
  overrides: Partial<ShoppingPlanItem> = {},
): ShoppingPlanItem {
  return {
    productTypeId: 'type-detergent',
    baseName: 'Detergente',
    category: 'cleaning',
    defaultUnit: 'lt',
    totalQuantity: 3,
    estimatedCurrentQuantity: 1,
    estimatedConsumedQuantity: 2,
    estimatedDepletionAt: new Date('2026-05-01T00:00:00.000Z'),
    recommendedPurchaseAt: new Date('2026-04-28T00:00:00.000Z'),
    suggestedPurchaseQuantity: 1,
    estimatedUnitPrice: 42.5,
    estimatedLineTotal: 42.5,
    effectivePlanningSettings: makePantryGroup().effectivePlanningSettings,
    shoppingMetadata: {
      householdStaple: false,
      buyOnlyOnPromo: false,
      estimatedUnitPrice: 42.5,
    },
    urgency: 'critical',
    depletionRule: {
      enabled: true,
      consumeAmount: 1,
      unit: 'lt',
      everyAmount: 1,
      everyPeriod: 'week',
      anchorDate: new Date('2026-04-17T00:00:00.000Z'),
    },
    ...overrides,
  };
}
