import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { BehaviorSubject, Observable, TimeoutError, of } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  startWith,
  switchMap,
  timeout,
} from 'rxjs/operators';
import { AuthFacade } from '../../core/services/auth.facade';
import { PantryService } from '../../core/services/pantry.service';
import {
  ArchivedPantryItems,
  CloseShoppingPurchaseItemRequest,
  DEPLETION_PERIODS,
  DepletionPeriod,
  ExpirationStatus,
  InventoryLot,
  PRODUCT_CATEGORIES,
  PRODUCT_UNITS,
  SHOPPING_LOCATION_OPTIONS,
  STORAGE_LOCATION_OPTIONS,
  ProductCategory,
  ProductTypeEffectivePlanningSettings,
  PantryLotSummary,
  PantryOverviewItem,
  PantryStapleItem,
  PantryStapleStatus,
  PantryValueInsights,
  PriceReferenceItem,
  ProductTypeDepletionRuleRequest,
  ProductTypePlanningSettingsRequest,
  ProductTypeShoppingMetadata,
  ProductTypeShoppingMetadataRequest,
  ProductType,
  ProductTypeSelectionMode,
  ProductUnit,
  ShoppingPlanItem,
  ShoppingPlanUrgency,
  ShoppingRouteGroup,
} from '../../shared/models/pantry.model';
import * as PantryActions from '../../store/pantry/pantry.actions';
import {
  selectExpiringGroups,
  selectDepletingGroups,
  selectExpiredEntryAlert,
  selectPantryError,
  selectPantryGroupsSorted,
  selectPantryInitialLoading,
  selectPantryLoading,
  selectPantrySummary,
  selectPantryValueInsights,
  selectPriceReferenceItems,
  selectShowGuidanceTips,
  selectShoppingPlanItems,
  selectShoppingRouteGroups,
  selectStapleItems,
} from '../../store/pantry/pantry.selectors';

interface DeleteConfirmationTarget {
  kind: 'productType' | 'inventoryLot';
  id: string;
  expectedText: string;
}

interface ArchiveConfirmationTarget {
  kind: 'productType' | 'inventoryLot';
  id: string;
  label: string;
  message: string;
}

interface QuickCaptureItem {
  name: string;
  quantity: number;
  unit: string;
  shoppingLocation?: string;
  estimatedUnitPrice?: number;
}

interface QuickCaptureDraft {
  id: string;
  createdAt: Date;
  rawText: string;
  items: QuickCaptureItem[];
}

interface ShoppingTripDraftItem {
  productTypeId: string;
  checked: boolean;
  quantity: number;
  unit: ProductUnit;
  paidUnitPrice?: number;
  shoppingLocation?: string;
}

interface PendingShoppingCheckout {
  id: string;
  createdAt: Date;
  items: CloseShoppingPurchaseItemRequest[];
}

interface ScreenWakeLock {
  release: () => Promise<void>;
}

@Component({
  selector: 'app-pantry-page',
  templateUrl: './pantry-page.component.html',
  styleUrl: './pantry-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class PantryPageComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authFacade = inject(AuthFacade);
  private readonly pantryService = inject(PantryService);
  private readonly store = inject(Store);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly lotRegistrationTimeoutMs = 15000;
  private readonly shoppingBudgetStorageKey = 'pantrylist.shoppingBudget';
  private readonly quickCaptureStorageKey = 'pantrylist.quickCaptureDrafts';
  private readonly shoppingTripStorageKey = 'pantrylist.shoppingTripDraft';
  private readonly pendingShoppingCheckoutStorageKey =
    'pantrylist.pendingShoppingCheckouts';

  readonly username$ = this.authFacade.currentUsername$;
  readonly loading$ = this.store.select(selectPantryLoading);
  readonly initialLoading$ = this.store.select(selectPantryInitialLoading);
  readonly error$ = this.store.select(selectPantryError);
  readonly summary$ = this.store.select(selectPantrySummary);
  readonly expiringGroups$ = this.store.select(selectExpiringGroups);
  readonly expiredAlert$ = this.store.select(selectExpiredEntryAlert);
  readonly depletingGroups$ = this.store.select(selectDepletingGroups);
  readonly shoppingPlanItems$ = this.store.select(selectShoppingPlanItems);
  readonly shoppingRouteGroups$ = this.store.select(selectShoppingRouteGroups);
  readonly priceReferenceItems$ = this.store.select(selectPriceReferenceItems);
  readonly stapleItems$ = this.store.select(selectStapleItems);
  readonly valueInsights$ = this.store.select(selectPantryValueInsights);
  readonly pantryGroups$ = this.store.select(selectPantryGroupsSorted);
  readonly showGuidanceTips$ = this.store.select(selectShowGuidanceTips);

  readonly searchingTypeSuggestions$ = new BehaviorSubject(false);
  readonly selectionModeOptions: ProductTypeSelectionMode[] = [
    'existing',
    'new',
  ];
  readonly categoryOptions = PRODUCT_CATEGORIES;
  readonly unitOptions = PRODUCT_UNITS;
  readonly storageLocationOptions = STORAGE_LOCATION_OPTIONS;
  readonly shoppingLocationOptions = SHOPPING_LOCATION_OPTIONS;
  readonly depletionPeriodOptions = DEPLETION_PERIODS;

  readonly categoryLabels: Record<ProductCategory, string> = {
    food: 'Comida',
    cleaning: 'Limpieza',
    hygiene: 'Higiene',
    other: 'Otros',
  };

  readonly expirationLabels: Record<ExpirationStatus, string> = {
    expired: 'Ya caducó',
    critical: 'Crítico',
    soon: 'Próximo',
    stable: 'Estable',
    none: 'Sin caducidad',
  };

  readonly depletionPeriodLabels: Record<DepletionPeriod, string> = {
    day: 'dias',
    week: 'semanas',
    month: 'meses',
  };

  readonly shoppingPlanUrgencyLabels: Record<ShoppingPlanUrgency, string> = {
    depleted: 'Comprar ya',
    critical: 'Comprar esta semana',
    upcoming: 'Comprar pronto',
  };
  readonly stapleStatusLabels: Record<PantryStapleStatus, string> = {
    missing: 'Falta en casa',
    low: 'Revisar pronto',
    available: 'Cubierto',
  };

  readonly lotForm = this.formBuilder.nonNullable.group({
    selectionMode: [
      'existing' as ProductTypeSelectionMode,
      Validators.required,
    ],
    existingTypeSearch: [''],
    existingProductTypeId: [''],
    newBaseName: ['', [Validators.maxLength(80)]],
    category: ['food' as ProductCategory, Validators.required],
    unit: ['piezas' as ProductUnit, Validators.required],
    storageLocation: ['', [Validators.maxLength(80)]],
    shoppingLocation: ['', [Validators.maxLength(80)]],
    preferredBrand: ['', [Validators.maxLength(80)]],
    substituteBrand: ['', [Validators.maxLength(80)]],
    householdStaple: [false],
    buyOnlyOnPromo: [false],
    shoppingNotes: ['', [Validators.maxLength(160)]],
    estimatedUnitPrice: [
      null as number | null,
      [Validators.min(0.01), Validators.max(1000000)],
    ],
    variantName: ['', [Validators.maxLength(80)]],
    quantity: [1, [Validators.required, Validators.min(0.1)]],
    expiresAt: [''],
    purchaseDate: [''],
    enableDurability: [false],
    depletionConsumeAmount: [1, [Validators.required, Validators.min(0.01)]],
    depletionEveryAmount: [1, [Validators.required, Validators.min(1)]],
    depletionEveryPeriod: ['month' as DepletionPeriod, Validators.required],
    depletionAnchorDate: [toDateInputValue(new Date()), Validators.required],
  });

  readonly depletionRuleForm = this.formBuilder.nonNullable.group({
    enabled: [true],
    consumeAmount: [1, [Validators.required, Validators.min(0.01)]],
    everyAmount: [1, [Validators.required, Validators.min(1)]],
    everyPeriod: ['month' as DepletionPeriod, Validators.required],
    anchorDate: [toDateInputValue(new Date()), Validators.required],
  });

  readonly planningSettingsForm = this.formBuilder.group({
    planningEnabled: [true],
    expirationWarningDaysOverride: [
      null as number | null,
      [Validators.min(1), Validators.max(60)],
    ],
    depletionWarningThresholdRatioOverride: [
      null as number | null,
      [Validators.min(0.25), Validators.max(4)],
    ],
    shoppingPlanLeadDaysOverride: [
      null as number | null,
      [Validators.min(0), Validators.max(30)],
    ],
  });

  readonly shoppingMetadataForm = this.formBuilder.nonNullable.group({
    storageLocation: ['', [Validators.maxLength(80)]],
    shoppingLocation: ['', [Validators.maxLength(80)]],
    preferredBrand: ['', [Validators.maxLength(80)]],
    substituteBrand: ['', [Validators.maxLength(80)]],
    householdStaple: [false],
    buyOnlyOnPromo: [false],
    shoppingNotes: ['', [Validators.maxLength(160)]],
    estimatedUnitPrice: [
      null as number | null,
      [Validators.min(0.01), Validators.max(1000000)],
    ],
  });

  readonly shoppingBudgetForm = this.formBuilder.group({
    amount: [null as number | null, [Validators.min(0)]],
  });

  readonly quickCaptureForm = this.formBuilder.nonNullable.group({
    rawText: [''],
  });

  readonly existingTypeSuggestions$ =
    this.lotForm.controls.selectionMode.valueChanges.pipe(
      startWith(this.lotForm.controls.selectionMode.getRawValue()),
      switchMap((selectionMode) => {
        if (selectionMode !== 'existing') {
          this.searchingTypeSuggestions$.next(false);
          return of([] as ProductType[]);
        }

        return this.lotForm.controls.existingTypeSearch.valueChanges.pipe(
          startWith(this.lotForm.controls.existingTypeSearch.getRawValue()),
          debounceTime(250),
          distinctUntilChanged(),
          switchMap((search) => {
            this.searchingTypeSuggestions$.next(true);

            return this.pantryService.searchProductTypes(search.trim()).pipe(
              finalize(() => this.searchingTypeSuggestions$.next(false)),
              catchError(() => {
                this.searchingTypeSuggestions$.next(false);
                return of([] as ProductType[]);
              })
            );
          })
        );
      })
    );

  selectedExistingType: ProductType | null = null;
  registerError: string | null = null;
  submittingLot = false;
  consumeBusyLotId: string | null = null;
  editingDepletionProductTypeId: string | null = null;
  depletionRuleSavingProductTypeId: string | null = null;
  depletionRuleError: string | null = null;
  expiredAlertDismissed = false;
  guidanceDismissed = false;
  archivedPanelOpen = false;
  archivedLoading = false;
  archivedError: string | null = null;
  archivedItems: ArchivedPantryItems | null = null;
  mutationBusyKey: string | null = null;
  archiveConfirmationTarget: ArchiveConfirmationTarget | null = null;
  deleteConfirmationTarget: DeleteConfirmationTarget | null = null;
  deleteConfirmationInput = '';
  deleteConfirmationError: string | null = null;
  editingPlanningProductTypeId: string | null = null;
  planningSettingsSavingProductTypeId: string | null = null;
  planningSettingsError: string | null = null;
  editingShoppingMetadataProductTypeId: string | null = null;
  shoppingMetadataSavingProductTypeId: string | null = null;
  shoppingMetadataError: string | null = null;
  shoppingExportStatus: string | null = null;
  shoppingExportText: string | null = null;
  shoppingShareStatus: string | null = null;
  shoppingShareLink: string | null = null;
  shoppingShareToken: string | null = null;
  shoppingShareExpiresAt: Date | null = null;
  shoppingShareBusy = false;
  shoppingBudget: number | null = null;
  shoppingModeActive = false;
  shoppingTripDraft: Record<string, ShoppingTripDraftItem> = {};
  shoppingCheckoutStatus: string | null = null;
  shoppingCheckoutBusy = false;
  privacyExportStatus: string | null = null;
  privacyExportBusy = false;
  quickCaptureDrafts: QuickCaptureDraft[] = [];
  quickCaptureStatus: string | null = null;
  pendingShoppingCheckoutCount = 0;
  isOffline = false;
  readonly consumeErrors: Record<string, string> = {};
  private readonly expandedProductTypeIds = new Set<string>();
  private shoppingWakeLock: ScreenWakeLock | null = null;
  private pendingShoppingCheckoutSyncing = false;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadOverview();
      this.watchNetworkState();
      this.loadLocalShoppingSupport();
      this.destroyRef.onDestroy(() => {
        void this.releaseShoppingWakeLock();
      });
    }

    this.lotForm.controls.existingTypeSearch.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.selectedExistingType) {
          this.selectedExistingType = null;
          this.lotForm.patchValue(
            {
              existingProductTypeId: '',
            },
            { emitEvent: false }
          );
        }
      });

    this.lotForm.controls.selectionMode.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((selectionMode) => {
        this.registerError = null;

        if (selectionMode === 'new') {
          this.selectedExistingType = null;
          this.lotForm.patchValue(
            {
              existingTypeSearch: '',
              existingProductTypeId: '',
              unit: 'piezas',
              enableDurability: false,
              depletionConsumeAmount: 1,
              depletionEveryAmount: 1,
              depletionEveryPeriod: 'month',
              depletionAnchorDate: toDateInputValue(new Date()),
            },
            { emitEvent: false }
          );
        }
      });
  }

  setSelectionMode(selectionMode: ProductTypeSelectionMode): void {
    this.lotForm.controls.selectionMode.setValue(selectionMode);
  }

  selectExistingProductType(productType: ProductType): void {
    this.selectedExistingType = productType;
    this.lotForm.patchValue(
      {
        existingTypeSearch: productType.baseName,
        existingProductTypeId: productType.id,
        unit: productType.defaultUnit,
      },
      { emitEvent: false }
    );
    this.patchDepletionRuleControls(productType);
    this.registerError = null;
  }

  isGroupExpanded(productTypeId: string): boolean {
    return this.expandedProductTypeIds.has(productTypeId);
  }

  toggleGroup(productTypeId: string): void {
    if (this.expandedProductTypeIds.has(productTypeId)) {
      this.expandedProductTypeIds.delete(productTypeId);
      return;
    }

    this.expandedProductTypeIds.add(productTypeId);
  }

  getLotUnitPreview(): string {
    if (this.lotForm.controls.selectionMode.value === 'existing') {
      return (
        this.selectedExistingType?.defaultUnit ?? 'Selecciona un tipo base'
      );
    }

    return this.lotForm.controls.unit.value;
  }

  startEditingDepletionRule(group: PantryOverviewItem): void {
    const rule = group.depletionRule;
    this.editingDepletionProductTypeId = group.productTypeId;
    this.depletionRuleError = null;
    this.depletionRuleForm.reset({
      enabled: rule?.enabled ?? true,
      consumeAmount: rule?.consumeAmount ?? 1,
      everyAmount: rule?.everyAmount ?? 1,
      everyPeriod: rule?.everyPeriod ?? 'month',
      anchorDate: rule?.anchorDate
        ? toDateInputValue(rule.anchorDate)
        : toDateInputValue(new Date()),
    });
  }

  cancelEditingDepletionRule(): void {
    this.editingDepletionProductTypeId = null;
    this.depletionRuleError = null;
  }

  startEditingPlanningSettings(group: PantryOverviewItem): void {
    const settings = group.effectivePlanningSettings;
    this.editingPlanningProductTypeId = group.productTypeId;
    this.planningSettingsError = null;
    this.planningSettingsForm.reset({
      planningEnabled: settings.planningEnabled,
      expirationWarningDaysOverride:
        settings.expirationWarningDaysSource === 'productType'
          ? settings.expirationWarningDays
          : null,
      depletionWarningThresholdRatioOverride:
        settings.depletionWarningThresholdRatioSource === 'productType'
          ? settings.depletionWarningThresholdRatio
          : null,
      shoppingPlanLeadDaysOverride:
        settings.shoppingPlanLeadDaysSource === 'productType'
          ? settings.shoppingPlanLeadDays
          : null,
    });
  }

  cancelEditingPlanningSettings(): void {
    this.editingPlanningProductTypeId = null;
    this.planningSettingsError = null;
  }

  savePlanningSettings(group: PantryOverviewItem): void {
    if (this.planningSettingsForm.invalid) {
      this.planningSettingsForm.markAllAsTouched();
      this.planningSettingsError =
        'Revisa los rangos antes de guardar estas reglas.';
      return;
    }

    this.planningSettingsSavingProductTypeId = group.productTypeId;
    this.planningSettingsError = null;

    this.pantryService
      .updateProductTypePlanningSettings(
        group.productTypeId,
        this.buildPlanningSettingsRequest()
      )
      .pipe(
        finalize(() => {
          this.planningSettingsSavingProductTypeId = null;
          this.changeDetector.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.editingPlanningProductTypeId = null;
          this.loadOverview();
        },
        error: (error) => {
          this.planningSettingsError = this.getErrorMessage(error);
          this.changeDetector.markForCheck();
        },
      });
  }

  startEditingShoppingMetadata(group: PantryOverviewItem): void {
    const metadata = this.resolveShoppingMetadata(group.shoppingMetadata);
    this.editingShoppingMetadataProductTypeId = group.productTypeId;
    this.shoppingMetadataError = null;
    this.shoppingMetadataForm.reset({
      storageLocation: metadata.storageLocation ?? '',
      shoppingLocation: metadata.shoppingLocation ?? '',
      preferredBrand: metadata.preferredBrand ?? '',
      substituteBrand: metadata.substituteBrand ?? '',
      householdStaple: metadata.householdStaple,
      buyOnlyOnPromo: metadata.buyOnlyOnPromo,
      shoppingNotes: metadata.shoppingNotes ?? '',
      estimatedUnitPrice: metadata.estimatedUnitPrice ?? null,
    });
  }

  cancelEditingShoppingMetadata(): void {
    this.editingShoppingMetadataProductTypeId = null;
    this.shoppingMetadataError = null;
  }

  saveShoppingMetadata(group: PantryOverviewItem): void {
    if (this.shoppingMetadataForm.invalid) {
      this.shoppingMetadataForm.markAllAsTouched();
      this.shoppingMetadataError =
        'Revisa los datos de compra antes de guardar.';
      return;
    }

    this.shoppingMetadataSavingProductTypeId = group.productTypeId;
    this.shoppingMetadataError = null;

    this.pantryService
      .updateProductTypeShoppingMetadata(
        group.productTypeId,
        this.buildShoppingMetadataRequest(
          this.shoppingMetadataForm.getRawValue()
        )
      )
      .pipe(
        finalize(() => {
          this.shoppingMetadataSavingProductTypeId = null;
          this.changeDetector.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.editingShoppingMetadataProductTypeId = null;
          this.loadOverview();
        },
        error: (error) => {
          this.shoppingMetadataError = this.getErrorMessage(error);
          this.changeDetector.markForCheck();
        },
      });
  }

  saveDepletionRule(group: PantryOverviewItem): void {
    const rule = this.buildEditedDepletionRule(group.defaultUnit);

    if (!rule) {
      return;
    }

    this.depletionRuleSavingProductTypeId = group.productTypeId;
    this.depletionRuleError = null;

    this.pantryService
      .updateProductTypeDepletionRule(group.productTypeId, rule)
      .pipe(
        finalize(() => {
          this.depletionRuleSavingProductTypeId = null;
        })
      )
      .subscribe({
        next: () => {
          this.editingDepletionProductTypeId = null;
          this.loadOverview();
        },
        error: (error) => {
          this.depletionRuleError = this.getErrorMessage(error);
        },
      });
  }

  submitLot(): void {
    if (this.lotForm.invalid) {
      this.lotForm.markAllAsTouched();
      return;
    }

    const rawValue = this.lotForm.getRawValue();
    const quantity = Number(rawValue.quantity);
    const selectionMode = rawValue.selectionMode;

    if (selectionMode === 'existing' && !this.selectedExistingType) {
      this.registerError =
        'Selecciona un tipo base existente antes de registrar el lote.';
      return;
    }

    if (selectionMode === 'new' && !rawValue.newBaseName.trim()) {
      this.registerError = 'Define el tipo base que quieres crear.';
      return;
    }

    this.registerError = null;
    const lotUnit =
      selectionMode === 'existing'
        ? this.selectedExistingType?.defaultUnit ?? rawValue.unit
        : rawValue.unit;
    const defaultDepletionRule = this.buildDefaultDepletionRule(
      rawValue,
      lotUnit
    );

    if (rawValue.enableDurability && !defaultDepletionRule) {
      return;
    }

    this.submittingLot = true;
    this.pantryService
      .registerLot({
        selectionMode,
        existingProductTypeId:
          selectionMode === 'existing'
            ? this.selectedExistingType?.id
            : undefined,
        newProductType:
          selectionMode === 'new'
            ? {
                baseName: rawValue.newBaseName.trim(),
                category: rawValue.category,
                defaultUnit: rawValue.unit,
                defaultDepletionRule,
                shoppingMetadata: this.buildShoppingMetadataRequest(rawValue),
              }
            : undefined,
        defaultDepletionRule:
          selectionMode === 'existing' ? defaultDepletionRule : undefined,
        variantName: rawValue.variantName.trim() || undefined,
        quantity,
        unit: lotUnit,
        expiresAt: rawValue.expiresAt || undefined,
        purchaseDate: rawValue.purchaseDate || undefined,
      })
      .pipe(
        timeout({ first: this.lotRegistrationTimeoutMs }),
        finalize(() => {
          this.submittingLot = false;
        })
      )
      .subscribe({
        next: () => {
          this.resetLotForm();
          this.loadOverview();
        },
        error: (error) => {
          this.registerError = this.getErrorMessage(error);
        },
      });
  }

  consumeLot(lotId: string, quantity: number): void {
    if (this.consumeBusyLotId) {
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      this.consumeErrors[lotId] = 'Ingresa una cantidad valida para consumir.';
      return;
    }

    delete this.consumeErrors[lotId];
    this.consumeBusyLotId = lotId;

    this.pantryService
      .consumeInventoryLot(lotId, {
        quantity: Number(quantity.toFixed(2)),
      })
      .pipe(
        finalize(() => {
          this.consumeBusyLotId = null;
        })
      )
      .subscribe({
        next: () => {
          this.loadOverview();
        },
        error: (error) => {
          this.consumeErrors[lotId] = this.getErrorMessage(error);
        },
      });
  }

  dismissExpiredAlert(): void {
    this.expiredAlertDismissed = true;
  }

  dismissGuidance(): void {
    this.guidanceDismissed = true;
  }

  toggleArchivedPanel(): void {
    this.archivedPanelOpen = !this.archivedPanelOpen;

    if (this.archivedPanelOpen && !this.archivedItems) {
      this.loadArchivedItems();
    }
  }

  loadArchivedItems(): void {
    this.archivedLoading = true;
    this.archivedError = null;

    this.pantryService
      .getArchivedPantryItems()
      .pipe(
        finalize(() => {
          this.archivedLoading = false;
          this.changeDetector.markForCheck();
        })
      )
      .subscribe({
        next: (archivedItems) => {
          this.archivedItems = archivedItems;
        },
        error: (error) => {
          this.archivedError = this.getErrorMessage(error);
        },
      });
  }

  archiveProductType(group: PantryOverviewItem): void {
    this.startArchiveConfirmation({
      kind: 'productType',
      id: group.productTypeId,
      label: group.baseName,
      message:
        'Se quitara de la despensa activa, busquedas y compras sugeridas. Sus lotes activos tambien dejaran de contarse.',
    });
  }

  archiveLot(lot: PantryLotSummary): void {
    const lotName = this.getLotDisplayName(lot);

    this.startArchiveConfirmation({
      kind: 'inventoryLot',
      id: lot.lotId,
      label: lotName,
      message: 'Se quitara del inventario activo y de los calculos.',
    });
  }

  cancelArchiveConfirmation(): void {
    this.clearArchiveConfirmation();
  }

  isArchiveConfirmationOpen(
    kind: ArchiveConfirmationTarget['kind'],
    id: string
  ): boolean {
    return (
      this.archiveConfirmationTarget?.kind === kind &&
      this.archiveConfirmationTarget.id === id
    );
  }

  confirmArchiveConfirmation(): void {
    const target = this.archiveConfirmationTarget;

    if (!target) {
      return;
    }

    const request =
      target.kind === 'productType'
        ? this.pantryService.archiveProductType(target.id, {
            reason: 'Archivado desde la despensa',
          })
        : this.pantryService.archiveInventoryLot(target.id, {
            reason: 'Archivado desde la despensa',
          });
    const busyKey =
      target.kind === 'productType'
        ? `archive-type-${target.id}`
        : `archive-lot-${target.id}`;

    this.clearArchiveConfirmation();

    this.runMutation(busyKey, request, { refreshArchived: true });
  }

  restoreProductType(productType: ProductType): void {
    this.runMutation(
      `restore-type-${productType.id}`,
      this.pantryService.restoreProductType(productType.id),
      { refreshArchived: true }
    );
  }

  restoreInventoryLot(lot: InventoryLot): void {
    this.runMutation(
      `restore-lot-${lot.id}`,
      this.pantryService.restoreInventoryLot(lot.id),
      { refreshArchived: true }
    );
  }

  deleteArchivedProductType(productType: ProductType): void {
    this.startDeleteConfirmation({
      kind: 'productType',
      id: productType.id,
      expectedText: productType.baseName,
    });
  }

  deleteArchivedInventoryLot(lot: InventoryLot): void {
    this.startDeleteConfirmation({
      kind: 'inventoryLot',
      id: lot.id,
      expectedText: this.getInventoryLotDisplayName(lot),
    });
  }

  updateDeleteConfirmationInput(value: string): void {
    this.deleteConfirmationInput = value;
    this.deleteConfirmationError = null;
  }

  cancelDeleteConfirmation(): void {
    this.clearDeleteConfirmation();
  }

  isDeleteConfirmationOpen(
    kind: DeleteConfirmationTarget['kind'],
    id: string
  ): boolean {
    return (
      this.deleteConfirmationTarget?.kind === kind &&
      this.deleteConfirmationTarget.id === id
    );
  }

  canConfirmDelete(
    kind: DeleteConfirmationTarget['kind'],
    id: string
  ): boolean {
    return (
      this.isDeleteConfirmationOpen(kind, id) &&
      this.mutationBusyKey === null &&
      this.deleteConfirmationInput.trim() ===
        this.deleteConfirmationTarget?.expectedText
    );
  }

  confirmDeleteConfirmation(): void {
    const target = this.deleteConfirmationTarget;

    if (!target) {
      return;
    }

    const confirmationText = this.deleteConfirmationInput.trim();

    if (confirmationText !== target.expectedText) {
      this.deleteConfirmationError = `Escribe exactamente "${target.expectedText}" para confirmar.`;
      this.changeDetector.markForCheck();
      return;
    }

    const request =
      target.kind === 'productType'
        ? this.pantryService.deleteProductType(target.id, { confirmationText })
        : this.pantryService.deleteInventoryLot(target.id, {
            confirmationText,
          });
    const busyKey =
      target.kind === 'productType'
        ? `delete-type-${target.id}`
        : `delete-lot-${target.id}`;

    this.clearDeleteConfirmation();

    this.runMutation(busyKey, request, { refreshArchived: true });
  }

  reviewExpiredLots(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    document
      .getElementById('expired-priority-panel')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  logout(): void {
    this.authFacade.logout();
  }

  trackByProductTypeId(
    _: number,
    productType: { productTypeId: string }
  ): string {
    return productType.productTypeId;
  }

  trackByLotId(_: number, lot: { lotId: string }): string {
    return lot.lotId;
  }

  trackByShoppingLocation(_: number, group: ShoppingRouteGroup): string {
    return group.shoppingLocation;
  }

  trackByPriceReferenceId(_: number, item: PriceReferenceItem): string {
    return item.productTypeId;
  }

  getExpiredQuantity(group: { lots: PantryLotSummary[] }): number {
    return this.sumLotsByStatus(group.lots, ['expired']);
  }

  getPendingExpirationQuantity(group: { lots: PantryLotSummary[] }): number {
    return this.sumLotsByStatus(group.lots, ['critical', 'soon']);
  }

  getReviewQuantity(group: { lots: PantryLotSummary[] }): number {
    return Number(
      (
        this.getExpiredQuantity(group) +
        this.getPendingExpirationQuantity(group)
      ).toFixed(2)
    );
  }

  formatQuantity(quantity: number, unit: ProductUnit | undefined): string {
    const displayUnit = unit === 'piezas' && quantity === 1 ? 'pieza' : unit;

    return displayUnit ? `${quantity} ${displayUnit}` : `${quantity}`;
  }

  formatShoppingPrice(value: number | undefined): string {
    return value === undefined
      ? 'Sin estimado'
      : `${value.toFixed(2)} moneda local`;
  }

  getShoppingPlanEstimatedTotal(items: ShoppingPlanItem[]): number {
    return Number(
      items
        .reduce((sum, item) => sum + (item.estimatedLineTotal ?? 0), 0)
        .toFixed(2)
    );
  }

  getShoppingPlanTotalLabel(items: ShoppingPlanItem[]): string {
    if (!this.hasShoppingPriceEstimate(items)) {
      return 'Sin precios estimados';
    }

    return this.hasMissingShoppingPrices(items)
      ? 'Total parcial estimado'
      : 'Total estimado';
  }

  getShoppingPlanTotalSummary(items: ShoppingPlanItem[]): string {
    if (!this.hasShoppingPriceEstimate(items)) {
      return this.getShoppingPlanTotalLabel(items);
    }

    const totalValue = this.formatShoppingPrice(
      this.getShoppingPlanEstimatedTotal(items)
    );

    return `${this.getShoppingPlanTotalLabel(items)}: ${totalValue}`;
  }

  getStapleAttentionSummary(items: PantryStapleItem[]): string {
    const attentionCount = items.filter(
      (item) => item.status !== 'available'
    ).length;

    if (items.length === 0) {
      return 'Sin básicos marcados';
    }

    return attentionCount === 0
      ? `${items.length} básicos cubiertos`
      : `${attentionCount} de ${items.length} básicos por revisar`;
  }

  getStapleRestockSummary(items: PantryStapleItem[]): string {
    const total = Number(
      items
        .reduce((sum, item) => sum + (item.estimatedRestockTotal ?? 0), 0)
        .toFixed(2)
    );

    return total > 0
      ? `Reposición estimada: ${this.formatShoppingPrice(total)}`
      : 'Sin reposición estimada';
  }

  buildShoppingPlanExportText(items: ShoppingPlanItem[]): string {
    if (items.length === 0) {
      return 'Lista de compras PantryList\nSin compras sugeridas.';
    }

    const lines = [
      'Lista de compras PantryList',
      this.getShoppingPlanTotalSummary(items),
      '',
    ];

    for (const group of this.groupShoppingPlanByRoute(items)) {
      lines.push(`${group.location}:`);
      lines.push(`Subtotal ruta: ${this.getRouteTotalSummary(group.items)}`);

      const missingPriceCount = group.items.filter(
        (item) => item.estimatedLineTotal === undefined
      ).length;

      if (missingPriceCount > 0) {
        lines.push(
          `Precios pendientes: ${missingPriceCount} ${
            missingPriceCount === 1 ? 'producto' : 'productos'
          }`
        );
      }

      for (const item of group.items) {
        const metadata = this.resolveShoppingMetadata(item.shoppingMetadata);
        lines.push(
          `- ${item.baseName}: ${this.formatQuantity(
            item.suggestedPurchaseQuantity,
            item.defaultUnit
          )}`
        );

        if (item.estimatedLineTotal !== undefined) {
          lines.push(
            `  Aprox: ${this.formatShoppingPrice(item.estimatedLineTotal)}`
          );
        }

        if (metadata.preferredBrand) {
          lines.push(`  Marca: ${metadata.preferredBrand}`);
        }

        if (metadata.substituteBrand) {
          lines.push(`  Sustituto: ${metadata.substituteBrand}`);
        }

        if (metadata.buyOnlyOnPromo) {
          lines.push('  Solo promo');
        }

        if (metadata.shoppingNotes) {
          lines.push(`  Nota: ${metadata.shoppingNotes}`);
        }
      }

      lines.push('');
    }

    return lines.join('\n').trimEnd();
  }

  async copyShoppingPlan(items: ShoppingPlanItem[]): Promise<void> {
    const exportText = this.buildShoppingPlanExportText(items);
    this.shoppingExportText = exportText;

    const copyResult = await this.copyTextToClipboard(exportText);

    if (copyResult === 'native' || copyResult === 'legacy') {
      this.shoppingExportStatus = 'Lista copiada para WhatsApp.';
    } else {
      this.shoppingExportStatus = 'Lista generada para copiar manualmente.';
    }

    this.changeDetector.markForCheck();
  }

  async shareShoppingPlan(items: ShoppingPlanItem[]): Promise<void> {
    const exportText = this.buildShoppingPlanExportText(items);
    this.shoppingExportText = exportText;

    if (!isPlatformBrowser(this.platformId)) {
      this.shoppingExportStatus = 'Lista generada para compartir manualmente.';
      this.changeDetector.markForCheck();
      return;
    }

    const shareNavigator = navigator as Navigator & {
      share?: (data: { title?: string; text: string }) => Promise<void>;
    };

    if (shareNavigator.share) {
      try {
        await shareNavigator.share({
          title: 'Lista PantryList',
          text: exportText,
        });
        this.shoppingExportStatus = 'Lista lista para compartir.';
        this.changeDetector.markForCheck();
        return;
      } catch {
        this.shoppingExportStatus =
          'No se pudo abrir compartir; usa copia o WhatsApp.';
      }
    }

    await this.copyShoppingPlan(items);
  }

  createTemporaryShoppingShare(items: ShoppingPlanItem[]): void {
    const exportText = this.buildShoppingPlanExportText(items);
    this.shoppingExportText = exportText;

    if (!isPlatformBrowser(this.platformId)) {
      this.shoppingShareStatus = 'Enlace disponible solo en navegador.';
      this.shoppingShareLink = null;
      this.shoppingShareToken = null;
      this.shoppingShareExpiresAt = null;
      return;
    }

    this.shoppingShareBusy = true;
    this.shoppingShareStatus = 'Creando enlace temporal...';
    this.shoppingShareLink = null;
    this.shoppingShareToken = null;
    this.shoppingShareExpiresAt = null;
    this.pantryService
      .createShoppingShare({ text: exportText })
      .pipe(
        timeout(this.lotRegistrationTimeoutMs),
        finalize(() => {
          this.shoppingShareBusy = false;
          this.changeDetector.markForCheck();
        })
      )
      .subscribe({
        next: (share) => {
          if (!share.token) {
            this.shoppingShareStatus = 'No se pudo crear el enlace temporal.';
            return;
          }

          this.shoppingShareToken = share.token;
          this.shoppingShareExpiresAt = share.expiresAt;
          this.shoppingShareLink = `${window.location.origin}/shared-shopping-list?token=${encodeURIComponent(share.token)}`;
          this.shoppingShareStatus =
            'Enlace temporal creado. Puedes revocarlo cuando termines.';
        },
        error: (error) => {
          this.shoppingShareStatus = this.getErrorMessage(error);
        },
      });
  }

  revokeTemporaryShoppingShare(): void {
    if (!this.shoppingShareToken || this.shoppingShareBusy) {
      return;
    }

    this.shoppingShareBusy = true;
    this.shoppingShareStatus = 'Revocando enlace temporal...';
    this.pantryService
      .revokeShoppingShare(this.shoppingShareToken)
      .pipe(
        timeout(this.lotRegistrationTimeoutMs),
        finalize(() => {
          this.shoppingShareBusy = false;
          this.changeDetector.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.shoppingShareLink = null;
          this.shoppingShareToken = null;
          this.shoppingShareExpiresAt = null;
          this.shoppingShareStatus = 'Enlace temporal revocado.';
        },
        error: (error) => {
          this.shoppingShareStatus = this.getErrorMessage(error);
        },
      });
  }

  getWhatsAppShoppingUrl(exportText: string): string {
    return `https://wa.me/?text=${encodeURIComponent(exportText)}`;
  }

  private async copyTextToClipboard(
    text: string,
  ): Promise<'native' | 'legacy' | 'manual'> {
    if (!isPlatformBrowser(this.platformId)) {
      return 'manual';
    }

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return 'native';
      } catch {
        // Fall through to the legacy browser copy path.
      }
    }

    return this.copyTextWithLegacyCommand(text) ? 'legacy' : 'manual';
  }

  private copyTextWithLegacyCommand(text: string): boolean {
    if (typeof document.execCommand !== 'function') {
      return false;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      textarea.remove();
    }
  }

  downloadPantryExport(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.privacyExportStatus = 'Export disponible solo en navegador.';
      return;
    }

    this.privacyExportBusy = true;
    this.privacyExportStatus = null;

    this.pantryService
      .exportPantryData()
      .pipe(
        timeout(this.lotRegistrationTimeoutMs),
        finalize(() => {
          this.privacyExportBusy = false;
          this.changeDetector.markForCheck();
        })
      )
      .subscribe({
        next: (exportData) => {
          const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json',
          });
          const downloadUrl = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = downloadUrl;
          anchor.download = `pantrylist-export-${toDateInputValue(
            new Date()
          )}.json`;
          anchor.click();
          URL.revokeObjectURL(downloadUrl);
          this.privacyExportStatus = 'Export descargado en este navegador.';
        },
        error: (error) => {
          this.privacyExportStatus = this.getErrorMessage(error);
        },
      });
  }

  async enterShoppingMode(items: ShoppingPlanItem[]): Promise<void> {
    this.ensureShoppingTripDraft(items);
    this.shoppingModeActive = true;
    this.shoppingCheckoutStatus = this.isOffline
      ? 'Modo compra sin conexion; el cierre queda pendiente.'
      : 'Modo compra activo.';
    await this.requestShoppingWakeLock();
    this.changeDetector.markForCheck();
  }

  exitShoppingMode(): void {
    this.shoppingModeActive = false;
    this.shoppingCheckoutStatus = null;
    void this.releaseShoppingWakeLock();
    this.persistShoppingTripDraft();
  }

  getShoppingTripItem(item: ShoppingPlanItem): ShoppingTripDraftItem {
    return {
      ...this.buildDefaultShoppingTripItem(item),
      ...this.shoppingTripDraft[item.productTypeId],
      unit: item.defaultUnit,
    };
  }

  updateShoppingTripChecked(item: ShoppingPlanItem, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.updateShoppingTripDraftItem(item, { checked: input.checked });
  }

  updateShoppingTripQuantity(
    item: ShoppingPlanItem,
    value: string | number | null
  ): void {
    const quantity = this.toOptionalNumber(value);

    if (quantity === undefined || quantity <= 0) {
      this.shoppingCheckoutStatus = 'Cantidad invalida para cerrar compra.';
      return;
    }

    this.updateShoppingTripDraftItem(item, {
      quantity: Number(quantity.toFixed(2)),
    });
  }

  updateShoppingTripPaidUnitPrice(
    item: ShoppingPlanItem,
    value: string | number | null
  ): void {
    const paidUnitPrice = this.toOptionalNumber(value);

    this.updateShoppingTripDraftItem(item, {
      paidUnitPrice:
        paidUnitPrice === undefined || paidUnitPrice <= 0
          ? undefined
          : Number(paidUnitPrice.toFixed(2)),
    });
  }

  updateShoppingTripLocation(item: ShoppingPlanItem, value: string): void {
    this.updateShoppingTripDraftItem(item, {
      shoppingLocation: this.toOptionalText(value),
    });
  }

  closeShoppingTrip(items: ShoppingPlanItem[]): void {
    const selectedItems = this.getSelectedShoppingTripItems(items);

    if (selectedItems.length === 0) {
      this.shoppingCheckoutStatus = 'Marca al menos un producto comprado.';
      return;
    }

    const requestItems = this.buildCloseShoppingPurchaseItems(selectedItems);

    if (this.isOffline) {
      this.enqueuePendingShoppingCheckout(requestItems);
      this.shoppingCheckoutStatus =
        'Sin conexion. Cierre guardado para sincronizar despues.';
      this.shoppingModeActive = false;
      this.persistShoppingTripDraft();
      void this.releaseShoppingWakeLock();
      return;
    }

    this.shoppingCheckoutBusy = true;
    this.shoppingCheckoutStatus = null;

    this.pantryService
      .closeShoppingPurchase({ items: requestItems })
      .pipe(
        timeout(this.lotRegistrationTimeoutMs),
        finalize(() => {
          this.shoppingCheckoutBusy = false;
          this.changeDetector.markForCheck();
        })
      )
      .subscribe({
        next: (lots) => {
          this.shoppingCheckoutStatus = `Compra cerrada: ${lots.length} lotes registrados.`;
          this.shoppingModeActive = false;
          this.shoppingTripDraft = {};
          this.removeLocalValue(this.shoppingTripStorageKey);
          void this.releaseShoppingWakeLock();
          this.loadOverview();
        },
        error: (error) => {
          this.shoppingCheckoutStatus = this.getErrorMessage(error);
          this.persistShoppingTripDraft();
        },
      });
  }

  clearShoppingTripDraft(items: ShoppingPlanItem[]): void {
    this.shoppingTripDraft = {};
    this.ensureShoppingTripDraft(items);
    this.shoppingCheckoutStatus = 'Borrador de compra reiniciado.';
  }

  getShoppingTripSelectedCount(items: ShoppingPlanItem[]): number {
    return this.getSelectedShoppingTripItems(items).length;
  }

  getShoppingTripPlannedTotal(items: ShoppingPlanItem[]): number {
    return Number(
      this.getSelectedShoppingTripItems(items)
        .reduce(
          (sum, selection) =>
            sum + (selection.planItem.estimatedLineTotal ?? 0),
          0
        )
        .toFixed(2)
    );
  }

  getShoppingTripActualTotal(items: ShoppingPlanItem[]): number {
    return Number(
      this.getSelectedShoppingTripItems(items)
        .reduce((sum, selection) => {
          const unitPrice =
            selection.draft.paidUnitPrice ??
            selection.planItem.estimatedUnitPrice ??
            0;
          return sum + unitPrice * selection.draft.quantity;
        }, 0)
        .toFixed(2)
    );
  }

  getRouteTotalSummary(items: ShoppingPlanItem[]): string {
    if (!this.hasShoppingPriceEstimate(items)) {
      return 'sin precios estimados';
    }

    return this.formatShoppingPrice(this.getShoppingPlanEstimatedTotal(items));
  }

  getWasteSavingsSummary(insights: PantryValueInsights): string {
    return [
      `Riesgo desperdicio: ${this.formatShoppingPrice(
        insights.estimatedWasteAtRisk
      )}`,
      `${insights.pricedShoppingItemCount} con precio`,
      `${insights.unpricedShoppingItemCount} sin precio`,
      `${insights.promoOnlyShoppingItemCount} solo promo`,
    ].join(' · ');
  }

  saveShoppingBudget(amount?: number | null): void {
    const rawAmount = amount ?? this.shoppingBudgetForm.controls.amount.value;
    const parsedAmount = this.toOptionalNumber(rawAmount);

    if (parsedAmount === undefined || parsedAmount < 0) {
      this.shoppingBudget = null;
      this.removeLocalValue(this.shoppingBudgetStorageKey);
      this.shoppingBudgetForm.patchValue(
        { amount: null },
        { emitEvent: false }
      );
      return;
    }

    this.shoppingBudget = Number(parsedAmount.toFixed(2));
    this.shoppingBudgetForm.patchValue(
      { amount: this.shoppingBudget },
      { emitEvent: false }
    );
    this.setLocalValue(
      this.shoppingBudgetStorageKey,
      JSON.stringify(this.shoppingBudget)
    );
  }

  clearShoppingBudget(): void {
    this.shoppingBudget = null;
    this.shoppingBudgetForm.patchValue({ amount: null }, { emitEvent: false });
    this.removeLocalValue(this.shoppingBudgetStorageKey);
  }

  getBudgetStatusLabel(total: number): string {
    if (this.shoppingBudget === null) {
      return 'Sin presupuesto definido';
    }

    const difference = Number((this.shoppingBudget - total).toFixed(2));

    return difference >= 0
      ? `Dentro del presupuesto: quedan ${this.formatShoppingPrice(difference)}`
      : `Sobre presupuesto por ${this.formatShoppingPrice(
          Math.abs(difference)
        )}`;
  }

  getBudgetStatusTone(total: number): 'unset' | 'ok' | 'over' {
    if (this.shoppingBudget === null) {
      return 'unset';
    }

    return total <= this.shoppingBudget ? 'ok' : 'over';
  }

  parseQuickCaptureText(rawText: string): QuickCaptureItem[] {
    return rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => this.parseQuickCaptureLine(line))
      .filter((item): item is QuickCaptureItem => item !== null);
  }

  saveQuickCaptureDraft(): void {
    const rawText = this.quickCaptureForm.controls.rawText.value.trim();
    const items = this.parseQuickCaptureText(rawText);

    if (items.length === 0) {
      this.quickCaptureStatus =
        'Escribe al menos un producto para guardar el borrador.';
      return;
    }

    const draft: QuickCaptureDraft = {
      id: `${Date.now()}`,
      createdAt: new Date(),
      rawText,
      items,
    };

    this.quickCaptureDrafts = [draft, ...this.quickCaptureDrafts].slice(0, 8);
    this.quickCaptureForm.reset({ rawText: '' });
    this.quickCaptureStatus = this.isOffline
      ? 'Borrador guardado sin conexion.'
      : 'Borrador guardado para capturar cuando convenga.';
    this.persistQuickCaptureDrafts();
  }

  clearQuickCaptureDrafts(): void {
    this.quickCaptureDrafts = [];
    this.quickCaptureStatus = 'Borradores locales eliminados.';
    this.removeLocalValue(this.quickCaptureStorageKey);
  }

  useQuickCaptureItem(item: QuickCaptureItem): void {
    this.setSelectionMode('new');
    this.lotForm.patchValue(
      {
        newBaseName: item.name,
        unit: this.toKnownProductUnit(item.unit),
        quantity: item.quantity,
        shoppingLocation: item.shoppingLocation ?? '',
        estimatedUnitPrice: item.estimatedUnitPrice ?? null,
        purchaseDate: toDateInputValue(new Date()),
      },
      { emitEvent: false }
    );

    if (isPlatformBrowser(this.platformId)) {
      document
        .querySelector('.register-panel')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  getQuickCaptureTotal(items: QuickCaptureItem[]): number {
    return Number(
      items
        .reduce(
          (sum, item) => sum + (item.estimatedUnitPrice ?? 0) * item.quantity,
          0
        )
        .toFixed(2)
    );
  }

  getPlanningSourceLabel(
    settings: ProductTypeEffectivePlanningSettings,
    key:
      | 'expirationWarningDays'
      | 'depletionWarningThresholdRatio'
      | 'shoppingPlanLeadDays'
  ): string {
    const source = settings[`${key}Source`];
    return source === 'productType' ? 'Este tipo' : 'Perfil';
  }

  getLotDisplayName(lot: PantryLotSummary): string {
    return lot.variantName?.trim() || `Lote ${lot.lotId}`;
  }

  getInventoryLotDisplayName(lot: InventoryLot): string {
    return lot.variantName?.trim() || `Lote ${lot.id}`;
  }

  private parseQuickCaptureLine(line: string): QuickCaptureItem | null {
    const [namePart, quantityPart, locationPart, pricePart] = line
      .split('|')
      .map((part) => part.trim());
    const name = namePart?.trim();

    if (!name) {
      return null;
    }

    const quantityMatch = (quantityPart ?? '').match(
      /^(\d+(?:[\.,]\d+)?)\s*(.*)$/
    );
    const quantity = quantityMatch
      ? Number(quantityMatch[1].replace(',', '.'))
      : 1;
    const unit = quantityMatch?.[2]?.trim() || 'piezas';
    const estimatedUnitPrice = this.toOptionalNumber(pricePart);

    return {
      name,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      unit,
      shoppingLocation: this.toOptionalText(locationPart),
      estimatedUnitPrice:
        estimatedUnitPrice === undefined
          ? undefined
          : Number(estimatedUnitPrice.toFixed(2)),
    };
  }

  private loadLocalShoppingSupport(): void {
    const storedBudget = this.getLocalValue(this.shoppingBudgetStorageKey);

    if (storedBudget) {
      try {
        const parsedBudget = Number(JSON.parse(storedBudget));

        if (Number.isFinite(parsedBudget) && parsedBudget >= 0) {
          this.shoppingBudget = Number(parsedBudget.toFixed(2));
          this.shoppingBudgetForm.patchValue(
            { amount: this.shoppingBudget },
            { emitEvent: false }
          );
        }
      } catch {
        this.shoppingBudget = null;
      }
    }

    const storedDrafts = this.getLocalValue(this.quickCaptureStorageKey);

    if (storedDrafts) {
      try {
        const parsedDrafts = JSON.parse(storedDrafts) as Array<
          Omit<QuickCaptureDraft, 'createdAt'> & { createdAt: string }
        >;
        this.quickCaptureDrafts = parsedDrafts.map((draft) => ({
          ...draft,
          createdAt: new Date(draft.createdAt),
        }));
      } catch {
        this.quickCaptureDrafts = [];
      }
    }

    const storedTripDraft = this.getLocalValue(this.shoppingTripStorageKey);

    if (storedTripDraft) {
      try {
        const parsedItems = JSON.parse(
          storedTripDraft
        ) as ShoppingTripDraftItem[];
        this.shoppingTripDraft = parsedItems.reduce<
          Record<string, ShoppingTripDraftItem>
        >(
          (draft, item) => ({
            ...draft,
            [item.productTypeId]: item,
          }),
          {}
        );
      } catch {
        this.shoppingTripDraft = {};
      }
    }

    this.pendingShoppingCheckoutCount =
      this.loadPendingShoppingCheckouts().length;

    if (!this.isOffline) {
      this.flushPendingShoppingCheckouts();
    }
  }

  private watchNetworkState(): void {
    this.isOffline =
      typeof navigator !== 'undefined' ? !navigator.onLine : false;

    const setOnline = () => {
      this.isOffline = false;
      this.flushPendingShoppingCheckouts();
      this.changeDetector.markForCheck();
    };
    const setOffline = () => {
      this.isOffline = true;
      this.changeDetector.markForCheck();
    };

    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOffline);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('online', setOnline);
      window.removeEventListener('offline', setOffline);
    });
  }

  private persistQuickCaptureDrafts(): void {
    this.setLocalValue(
      this.quickCaptureStorageKey,
      JSON.stringify(this.quickCaptureDrafts)
    );
  }

  private ensureShoppingTripDraft(items: ShoppingPlanItem[]): void {
    this.shoppingTripDraft = items.reduce<
      Record<string, ShoppingTripDraftItem>
    >(
      (draft, item) => ({
        ...draft,
        [item.productTypeId]: this.getShoppingTripItem(item),
      }),
      {}
    );
    this.persistShoppingTripDraft();
  }

  private updateShoppingTripDraftItem(
    item: ShoppingPlanItem,
    patch: Partial<ShoppingTripDraftItem>
  ): void {
    this.shoppingTripDraft = {
      ...this.shoppingTripDraft,
      [item.productTypeId]: {
        ...this.getShoppingTripItem(item),
        ...patch,
        productTypeId: item.productTypeId,
        unit: item.defaultUnit,
      },
    };
    this.persistShoppingTripDraft();
  }

  private buildDefaultShoppingTripItem(
    item: ShoppingPlanItem
  ): ShoppingTripDraftItem {
    const metadata = this.resolveShoppingMetadata(item.shoppingMetadata);

    return {
      productTypeId: item.productTypeId,
      checked: false,
      quantity: item.suggestedPurchaseQuantity,
      unit: item.defaultUnit,
      paidUnitPrice: item.estimatedUnitPrice,
      shoppingLocation: metadata.shoppingLocation,
    };
  }

  private getSelectedShoppingTripItems(
    items: ShoppingPlanItem[]
  ): { planItem: ShoppingPlanItem; draft: ShoppingTripDraftItem }[] {
    return items
      .map((planItem) => ({
        planItem,
        draft: this.getShoppingTripItem(planItem),
      }))
      .filter((selection) => selection.draft.checked);
  }

  private persistShoppingTripDraft(): void {
    const draftItems = Object.values(this.shoppingTripDraft);

    if (draftItems.length === 0) {
      this.removeLocalValue(this.shoppingTripStorageKey);
      return;
    }

    this.setLocalValue(this.shoppingTripStorageKey, JSON.stringify(draftItems));
  }

  private buildCloseShoppingPurchaseItems(
    selectedItems: { draft: ShoppingTripDraftItem }[]
  ): CloseShoppingPurchaseItemRequest[] {
    return selectedItems.map(({ draft }) => ({
      productTypeId: draft.productTypeId,
      quantity: draft.quantity,
      unit: draft.unit,
      paidUnitPrice: draft.paidUnitPrice,
      shoppingLocation: draft.shoppingLocation,
    }));
  }

  private enqueuePendingShoppingCheckout(
    items: CloseShoppingPurchaseItemRequest[]
  ): void {
    const pendingCheckouts = [
      ...this.loadPendingShoppingCheckouts(),
      {
        id: `${Date.now()}`,
        createdAt: new Date(),
        items,
      },
    ];

    this.pendingShoppingCheckoutCount = pendingCheckouts.length;
    this.setLocalValue(
      this.pendingShoppingCheckoutStorageKey,
      JSON.stringify(pendingCheckouts)
    );
  }

  private flushPendingShoppingCheckouts(): void {
    if (this.isOffline || this.pendingShoppingCheckoutSyncing) {
      return;
    }

    const [nextCheckout, ...remainingCheckouts] =
      this.loadPendingShoppingCheckouts();

    if (!nextCheckout) {
      this.pendingShoppingCheckoutCount = 0;
      return;
    }

    this.pendingShoppingCheckoutSyncing = true;
    this.pantryService
      .closeShoppingPurchase({ items: nextCheckout.items })
      .pipe(timeout(this.lotRegistrationTimeoutMs))
      .subscribe({
        next: () => {
          this.persistPendingShoppingCheckouts(remainingCheckouts);
          if (remainingCheckouts.length === 0) {
            this.shoppingTripDraft = {};
            this.removeLocalValue(this.shoppingTripStorageKey);
          }
          this.shoppingCheckoutStatus = remainingCheckouts.length
            ? `Compra sincronizada. Quedan ${remainingCheckouts.length} pendientes.`
            : 'Compra pendiente sincronizada.';
          this.loadOverview();
          this.pendingShoppingCheckoutSyncing = false;
          this.flushPendingShoppingCheckouts();
          this.changeDetector.markForCheck();
        },
        error: (error) => {
          this.pendingShoppingCheckoutSyncing = false;
          this.shoppingCheckoutStatus = this.getErrorMessage(error);
          this.changeDetector.markForCheck();
        },
      });
  }

  private loadPendingShoppingCheckouts(): PendingShoppingCheckout[] {
    const storedCheckouts = this.getLocalValue(
      this.pendingShoppingCheckoutStorageKey
    );

    if (!storedCheckouts) {
      return [];
    }

    try {
      const parsedCheckouts = JSON.parse(storedCheckouts) as Array<
        Omit<PendingShoppingCheckout, 'createdAt'> & { createdAt: string }
      >;

      return parsedCheckouts.map((checkout) => ({
        ...checkout,
        createdAt: new Date(checkout.createdAt),
      }));
    } catch {
      return [];
    }
  }

  private persistPendingShoppingCheckouts(
    checkouts: PendingShoppingCheckout[]
  ): void {
    this.pendingShoppingCheckoutCount = checkouts.length;

    if (checkouts.length === 0) {
      this.removeLocalValue(this.pendingShoppingCheckoutStorageKey);
      return;
    }

    this.setLocalValue(
      this.pendingShoppingCheckoutStorageKey,
      JSON.stringify(checkouts)
    );
  }

  private async requestShoppingWakeLock(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const wakeLockNavigator = navigator as Navigator & {
      wakeLock?: {
        request: (type: 'screen') => Promise<ScreenWakeLock>;
      };
    };

    if (!wakeLockNavigator.wakeLock) {
      return;
    }

    try {
      this.shoppingWakeLock = await wakeLockNavigator.wakeLock.request(
        'screen'
      );
    } catch {
      this.shoppingCheckoutStatus =
        'Modo compra activo; este navegador puede bloquear pantalla.';
    }
  }

  private async releaseShoppingWakeLock(): Promise<void> {
    if (!this.shoppingWakeLock) {
      return;
    }

    try {
      await this.shoppingWakeLock.release();
    } catch {
      // Wake Lock is best effort only.
    } finally {
      this.shoppingWakeLock = null;
    }
  }

  private getLocalValue(key: string): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private setLocalValue(key: string, value: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      localStorage.setItem(key, value);
    } catch {
      this.quickCaptureStatus =
        'No se pudo guardar en este navegador; conserva el texto manualmente.';
    }
  }

  private removeLocalValue(key: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      localStorage.removeItem(key);
    } catch {
      // Local persistence is a convenience; failing closed keeps the app usable.
    }
  }

  private toKnownProductUnit(unit: string): ProductUnit {
    return PRODUCT_UNITS.includes(unit as ProductUnit)
      ? (unit as ProductUnit)
      : 'piezas';
  }

  private resetLotForm(): void {
    this.selectedExistingType = null;
    this.lotForm.reset({
      selectionMode: 'existing',
      existingTypeSearch: '',
      existingProductTypeId: '',
      newBaseName: '',
      category: 'food',
      unit: 'piezas',
      storageLocation: '',
      shoppingLocation: '',
      preferredBrand: '',
      substituteBrand: '',
      householdStaple: false,
      buyOnlyOnPromo: false,
      shoppingNotes: '',
      estimatedUnitPrice: null,
      variantName: '',
      quantity: 1,
      expiresAt: '',
      purchaseDate: '',
      enableDurability: false,
      depletionConsumeAmount: 1,
      depletionEveryAmount: 1,
      depletionEveryPeriod: 'month',
      depletionAnchorDate: toDateInputValue(new Date()),
    });
  }

  private loadOverview(): void {
    this.store.dispatch(PantryActions.loadPantryOverview());
  }

  private buildPlanningSettingsRequest(): ProductTypePlanningSettingsRequest {
    const rawValue = this.planningSettingsForm.getRawValue();

    return {
      planningEnabled: rawValue.planningEnabled ?? true,
      expirationWarningDaysOverride: this.toOptionalNumber(
        rawValue.expirationWarningDaysOverride
      ),
      depletionWarningThresholdRatioOverride: this.toOptionalNumber(
        rawValue.depletionWarningThresholdRatioOverride
      ),
      shoppingPlanLeadDaysOverride: this.toOptionalNumber(
        rawValue.shoppingPlanLeadDaysOverride
      ),
    };
  }

  private buildShoppingMetadataRequest(rawValue: {
    storageLocation?: string;
    shoppingLocation?: string;
    preferredBrand?: string;
    substituteBrand?: string;
    householdStaple?: boolean;
    buyOnlyOnPromo?: boolean;
    shoppingNotes?: string;
    estimatedUnitPrice?: number | string | null;
  }): ProductTypeShoppingMetadataRequest {
    const estimatedUnitPrice = this.toOptionalNumber(
      rawValue.estimatedUnitPrice
    );
    const metadata: ProductTypeShoppingMetadataRequest = {
      storageLocation: this.toOptionalText(rawValue.storageLocation),
      shoppingLocation: this.toOptionalText(rawValue.shoppingLocation),
      preferredBrand: this.toOptionalText(rawValue.preferredBrand),
      substituteBrand: this.toOptionalText(rawValue.substituteBrand),
      householdStaple: rawValue.householdStaple ?? false,
      buyOnlyOnPromo: rawValue.buyOnlyOnPromo ?? false,
      shoppingNotes: this.toOptionalText(rawValue.shoppingNotes),
    };

    if (estimatedUnitPrice !== undefined) {
      metadata.estimatedUnitPrice = Number(estimatedUnitPrice.toFixed(2));
    }

    return metadata;
  }

  private buildDefaultDepletionRule(
    rawValue: ReturnType<typeof this.lotForm.getRawValue>,
    unit: ProductUnit
  ): ProductTypeDepletionRuleRequest | undefined {
    if (!rawValue.enableDurability) {
      return undefined;
    }

    const consumeAmount = Number(rawValue.depletionConsumeAmount);
    const everyAmount = Number(rawValue.depletionEveryAmount);

    if (!Number.isFinite(consumeAmount) || consumeAmount <= 0) {
      this.submittingLot = false;
      this.registerError = 'La cantidad de durabilidad debe ser mayor a cero.';
      return undefined;
    }

    if (!Number.isFinite(everyAmount) || everyAmount <= 0) {
      this.submittingLot = false;
      this.registerError = 'El intervalo de durabilidad debe ser mayor a cero.';
      return undefined;
    }

    if (!rawValue.depletionAnchorDate) {
      this.submittingLot = false;
      this.registerError = 'Define desde que fecha empieza la durabilidad.';
      return undefined;
    }

    return {
      enabled: true,
      consumeAmount: Number(consumeAmount.toFixed(2)),
      unit,
      everyAmount,
      everyPeriod: rawValue.depletionEveryPeriod,
      anchorDate: rawValue.depletionAnchorDate,
    };
  }

  private buildEditedDepletionRule(
    unit: ProductUnit
  ): ProductTypeDepletionRuleRequest | undefined {
    const rawValue = this.depletionRuleForm.getRawValue();

    if (!rawValue.enabled) {
      return {
        enabled: false,
        consumeAmount: 1,
        unit,
        everyAmount: 1,
        everyPeriod: 'month',
        anchorDate: rawValue.anchorDate || toDateInputValue(new Date()),
      };
    }

    if (this.depletionRuleForm.invalid) {
      this.depletionRuleForm.markAllAsTouched();
      this.depletionRuleError = 'Revisa la durabilidad antes de guardarla.';
      return undefined;
    }

    const consumeAmount = Number(rawValue.consumeAmount);
    const everyAmount = Number(rawValue.everyAmount);

    if (!Number.isFinite(consumeAmount) || consumeAmount <= 0) {
      this.depletionRuleError =
        'La cantidad de durabilidad debe ser mayor a cero.';
      return undefined;
    }

    if (!Number.isFinite(everyAmount) || everyAmount <= 0) {
      this.depletionRuleError =
        'El intervalo de durabilidad debe ser mayor a cero.';
      return undefined;
    }

    return {
      enabled: true,
      consumeAmount: Number(consumeAmount.toFixed(2)),
      unit,
      everyAmount,
      everyPeriod: rawValue.everyPeriod,
      anchorDate: rawValue.anchorDate,
    };
  }

  private patchDepletionRuleControls(productType: ProductType): void {
    const rule = productType.defaultDepletionRule;

    this.lotForm.patchValue(
      {
        enableDurability: Boolean(rule?.enabled),
        depletionConsumeAmount: rule?.consumeAmount ?? 1,
        depletionEveryAmount: rule?.everyAmount ?? 1,
        depletionEveryPeriod: rule?.everyPeriod ?? 'month',
        depletionAnchorDate: rule?.anchorDate
          ? toDateInputValue(rule.anchorDate)
          : toDateInputValue(new Date()),
      },
      { emitEvent: false }
    );
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof TimeoutError) {
      return 'La solicitud tardo demasiado. Revisa tu conexion e intenta de nuevo.';
    }

    if (error instanceof HttpErrorResponse) {
      const apiMessage =
        typeof error.error?.message === 'string' ? error.error.message : null;
      return apiMessage ?? error.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'No se pudo completar la solicitud.';
  }

  private runMutation(
    busyKey: string,
    request: Observable<unknown>,
    options: { refreshArchived?: boolean } = {}
  ): void {
    if (this.mutationBusyKey) {
      return;
    }

    this.mutationBusyKey = busyKey;
    this.archivedError = null;

    request
      .pipe(
        finalize(() => {
          this.mutationBusyKey = null;
          this.changeDetector.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.loadOverview();

          if (options.refreshArchived || this.archivedPanelOpen) {
            this.loadArchivedItems();
          }
        },
        error: (error) => {
          this.archivedError = this.getErrorMessage(error);
          this.changeDetector.markForCheck();
        },
      });
  }

  private startArchiveConfirmation(target: ArchiveConfirmationTarget): void {
    this.archiveConfirmationTarget = target;
    this.archivedError = null;
  }

  private clearArchiveConfirmation(): void {
    this.archiveConfirmationTarget = null;
  }

  private startDeleteConfirmation(target: DeleteConfirmationTarget): void {
    this.deleteConfirmationTarget = target;
    this.deleteConfirmationInput = '';
    this.deleteConfirmationError = null;
    this.archivedError = null;
  }

  private clearDeleteConfirmation(): void {
    this.deleteConfirmationTarget = null;
    this.deleteConfirmationInput = '';
    this.deleteConfirmationError = null;
  }

  private toOptionalNumber(
    value: number | string | null | undefined
  ): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : undefined;
  }

  private toOptionalText(value: string | undefined): string | undefined {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
  }

  private resolveShoppingMetadata(
    metadata: ProductTypeShoppingMetadata | undefined
  ): ProductTypeShoppingMetadata {
    return {
      ...metadata,
      householdStaple: metadata?.householdStaple ?? false,
      buyOnlyOnPromo: metadata?.buyOnlyOnPromo ?? false,
    };
  }

  private groupShoppingPlanByRoute(
    items: ShoppingPlanItem[]
  ): { location: string; items: ShoppingPlanItem[] }[] {
    const grouped = new Map<string, ShoppingPlanItem[]>();

    for (const item of items) {
      const location =
        this.resolveShoppingMetadata(item.shoppingMetadata).shoppingLocation ||
        'Sin tienda definida';
      grouped.set(location, [...(grouped.get(location) ?? []), item]);
    }

    return Array.from(grouped.entries())
      .map(([location, groupedItems]) => ({
        location,
        items: groupedItems,
      }))
      .sort((left, right) =>
        left.location.localeCompare(right.location, 'es', {
          sensitivity: 'base',
        })
      );
  }

  private hasShoppingPriceEstimate(items: ShoppingPlanItem[]): boolean {
    return items.some((item) => item.estimatedLineTotal !== undefined);
  }

  private hasMissingShoppingPrices(items: ShoppingPlanItem[]): boolean {
    return items.some((item) => item.estimatedLineTotal === undefined);
  }

  private sumLotsByStatus(
    lots: PantryLotSummary[],
    statuses: ExpirationStatus[]
  ): number {
    return Number(
      lots
        .filter((lot) => statuses.includes(lot.expirationStatus))
        .reduce(
          (sum, lot) =>
            Number.isFinite(lot.quantity) ? sum + lot.quantity : sum,
          0
        )
        .toFixed(2)
    );
  }
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}
