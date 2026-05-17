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
  ProductTypeDepletionRuleRequest,
  ProductTypePlanningSettingsRequest,
  ProductTypeShoppingMetadata,
  ProductTypeShoppingMetadataRequest,
  ProductType,
  ProductTypeSelectionMode,
  ProductUnit,
  ShoppingPlanItem,
  ShoppingPlanUrgency,
} from '../../shared/models/pantry.model';
import * as PantryActions from '../../store/pantry/pantry.actions';
import {
  selectExpiringGroups,
  selectDepletingGroups,
  selectExpiredEntryAlert,
  selectPantryError,
  selectPantryGroupsSorted,
  selectPantryLoading,
  selectPantrySummary,
  selectShowGuidanceTips,
  selectShoppingPlanItems,
} from '../../store/pantry/pantry.selectors';

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

  readonly username$ = this.authFacade.currentUsername$;
  readonly loading$ = this.store.select(selectPantryLoading);
  readonly error$ = this.store.select(selectPantryError);
  readonly summary$ = this.store.select(selectPantrySummary);
  readonly expiringGroups$ = this.store.select(selectExpiringGroups);
  readonly expiredAlert$ = this.store.select(selectExpiredEntryAlert);
  readonly depletingGroups$ = this.store.select(selectDepletingGroups);
  readonly shoppingPlanItems$ = this.store.select(selectShoppingPlanItems);
  readonly pantryGroups$ = this.store.select(selectPantryGroupsSorted);
  readonly showGuidanceTips$ = this.store.select(selectShowGuidanceTips);

  readonly searchingTypeSuggestions$ = new BehaviorSubject(false);
  readonly selectionModeOptions: ProductTypeSelectionMode[] = ['existing', 'new'];
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

  readonly lotForm = this.formBuilder.nonNullable.group({
    selectionMode: ['existing' as ProductTypeSelectionMode, Validators.required],
    existingTypeSearch: [''],
    existingProductTypeId: [''],
    newBaseName: ['', [Validators.maxLength(80)]],
    category: ['food' as ProductCategory, Validators.required],
    unit: ['piezas' as ProductUnit, Validators.required],
    storageLocation: ['', [Validators.maxLength(80)]],
    shoppingLocation: ['', [Validators.maxLength(80)]],
    preferredBrand: ['', [Validators.maxLength(80)]],
    substituteBrand: ['', [Validators.maxLength(80)]],
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
    buyOnlyOnPromo: [false],
    shoppingNotes: ['', [Validators.maxLength(160)]],
    estimatedUnitPrice: [
      null as number | null,
      [Validators.min(0.01), Validators.max(1000000)],
    ],
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
              }),
            );
          }),
        );
      }),
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
  editingPlanningProductTypeId: string | null = null;
  planningSettingsSavingProductTypeId: string | null = null;
  planningSettingsError: string | null = null;
  editingShoppingMetadataProductTypeId: string | null = null;
  shoppingMetadataSavingProductTypeId: string | null = null;
  shoppingMetadataError: string | null = null;
  shoppingExportStatus: string | null = null;
  shoppingExportText: string | null = null;
  readonly consumeErrors: Record<string, string> = {};
  private readonly expandedProductTypeIds = new Set<string>();

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadOverview();
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
            { emitEvent: false },
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
            { emitEvent: false },
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
      { emitEvent: false },
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
      return this.selectedExistingType?.defaultUnit ?? 'Selecciona un tipo base';
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
      this.planningSettingsError = 'Revisa los rangos antes de guardar estas reglas.';
      return;
    }

    this.planningSettingsSavingProductTypeId = group.productTypeId;
    this.planningSettingsError = null;

    this.pantryService
      .updateProductTypePlanningSettings(
        group.productTypeId,
        this.buildPlanningSettingsRequest(),
      )
      .pipe(
        finalize(() => {
          this.planningSettingsSavingProductTypeId = null;
          this.changeDetector.markForCheck();
        }),
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
      this.shoppingMetadataError = 'Revisa los datos de compra antes de guardar.';
      return;
    }

    this.shoppingMetadataSavingProductTypeId = group.productTypeId;
    this.shoppingMetadataError = null;

    this.pantryService
      .updateProductTypeShoppingMetadata(
        group.productTypeId,
        this.buildShoppingMetadataRequest(
          this.shoppingMetadataForm.getRawValue(),
        ),
      )
      .pipe(
        finalize(() => {
          this.shoppingMetadataSavingProductTypeId = null;
          this.changeDetector.markForCheck();
        }),
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
        }),
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
      this.registerError = 'Selecciona un tipo base existente antes de registrar el lote.';
      return;
    }

    if (selectionMode === 'new' && !rawValue.newBaseName.trim()) {
      this.registerError = 'Define el tipo base que quieres crear.';
      return;
    }

    this.registerError = null;
    const lotUnit =
      selectionMode === 'existing'
        ? (this.selectedExistingType?.defaultUnit ?? rawValue.unit)
        : rawValue.unit;
    const defaultDepletionRule = this.buildDefaultDepletionRule(rawValue, lotUnit);

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
        }),
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
        }),
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
        }),
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
    if (
      !this.confirmAction(
        `Archivar "${group.baseName}" lo quitara de la despensa activa, busquedas y compras sugeridas. Sus lotes activos tambien dejaran de contarse. Continuar?`,
      )
    ) {
      return;
    }

    this.runMutation(
      `archive-type-${group.productTypeId}`,
      this.pantryService.archiveProductType(group.productTypeId, {
        reason: 'Archivado desde la despensa',
      }),
      { refreshArchived: true },
    );
  }

  archiveLot(lot: PantryLotSummary): void {
    const lotName = this.getLotDisplayName(lot);

    if (
      !this.confirmAction(
        `Archivar "${lotName}" lo quitara del inventario activo y de los calculos. Continuar?`,
      )
    ) {
      return;
    }

    this.runMutation(
      `archive-lot-${lot.lotId}`,
      this.pantryService.archiveInventoryLot(lot.lotId, {
        reason: 'Archivado desde la despensa',
      }),
      { refreshArchived: true },
    );
  }

  restoreProductType(productType: ProductType): void {
    this.runMutation(
      `restore-type-${productType.id}`,
      this.pantryService.restoreProductType(productType.id),
      { refreshArchived: true },
    );
  }

  restoreInventoryLot(lot: InventoryLot): void {
    this.runMutation(
      `restore-lot-${lot.id}`,
      this.pantryService.restoreInventoryLot(lot.id),
      { refreshArchived: true },
    );
  }

  deleteArchivedProductType(productType: ProductType): void {
    const confirmationText = this.promptDeleteConfirmation(productType.baseName);

    if (confirmationText === null) {
      return;
    }

    this.runMutation(
      `delete-type-${productType.id}`,
      this.pantryService.deleteProductType(productType.id, { confirmationText }),
      { refreshArchived: true },
    );
  }

  deleteArchivedInventoryLot(lot: InventoryLot): void {
    const displayName = this.getInventoryLotDisplayName(lot);
    const confirmationText = this.promptDeleteConfirmation(displayName);

    if (confirmationText === null) {
      return;
    }

    this.runMutation(
      `delete-lot-${lot.id}`,
      this.pantryService.deleteInventoryLot(lot.id, { confirmationText }),
      { refreshArchived: true },
    );
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

  trackByProductTypeId(_: number, productType: { productTypeId: string }): string {
    return productType.productTypeId;
  }

  trackByLotId(_: number, lot: { lotId: string }): string {
    return lot.lotId;
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
      ).toFixed(2),
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
      items.reduce((sum, item) => sum + (item.estimatedLineTotal ?? 0), 0).toFixed(2),
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
      this.getShoppingPlanEstimatedTotal(items),
    );

    return `${this.getShoppingPlanTotalLabel(items)}: ${totalValue}`;
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

    for (const item of items) {
      const metadata = this.resolveShoppingMetadata(item.shoppingMetadata);
      lines.push(
        `- ${item.baseName}: ${this.formatQuantity(
          item.suggestedPurchaseQuantity,
          item.defaultUnit,
        )}`,
      );

      if (item.estimatedLineTotal !== undefined) {
        lines.push(`  Aprox: ${this.formatShoppingPrice(item.estimatedLineTotal)}`);
      }

      if (metadata.shoppingLocation) {
        lines.push(`  Comprar en: ${metadata.shoppingLocation}`);
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

    return lines.join('\n');
  }

  async copyShoppingPlan(items: ShoppingPlanItem[]): Promise<void> {
    const exportText = this.buildShoppingPlanExportText(items);
    this.shoppingExportText = exportText;

    if (!isPlatformBrowser(this.platformId) || !navigator.clipboard?.writeText) {
      this.shoppingExportStatus = 'Lista generada para copiar manualmente.';
      this.changeDetector.markForCheck();
      return;
    }

    try {
      await navigator.clipboard.writeText(exportText);
      this.shoppingExportStatus = 'Lista copiada para WhatsApp.';
    } catch {
      this.shoppingExportStatus = 'No se pudo copiar; lista generada manualmente.';
    } finally {
      this.changeDetector.markForCheck();
    }
  }

  getPlanningSourceLabel(
    settings: ProductTypeEffectivePlanningSettings,
    key:
      | 'expirationWarningDays'
      | 'depletionWarningThresholdRatio'
      | 'shoppingPlanLeadDays',
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
        rawValue.expirationWarningDaysOverride,
      ),
      depletionWarningThresholdRatioOverride: this.toOptionalNumber(
        rawValue.depletionWarningThresholdRatioOverride,
      ),
      shoppingPlanLeadDaysOverride: this.toOptionalNumber(
        rawValue.shoppingPlanLeadDaysOverride,
      ),
    };
  }

  private buildShoppingMetadataRequest(rawValue: {
    storageLocation?: string;
    shoppingLocation?: string;
    preferredBrand?: string;
    substituteBrand?: string;
    buyOnlyOnPromo?: boolean;
    shoppingNotes?: string;
    estimatedUnitPrice?: number | string | null;
  }): ProductTypeShoppingMetadataRequest {
    const estimatedUnitPrice = this.toOptionalNumber(rawValue.estimatedUnitPrice);
    const metadata: ProductTypeShoppingMetadataRequest = {
      storageLocation: this.toOptionalText(rawValue.storageLocation),
      shoppingLocation: this.toOptionalText(rawValue.shoppingLocation),
      preferredBrand: this.toOptionalText(rawValue.preferredBrand),
      substituteBrand: this.toOptionalText(rawValue.substituteBrand),
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
    unit: ProductUnit,
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
    unit: ProductUnit,
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
      this.depletionRuleError = 'La cantidad de durabilidad debe ser mayor a cero.';
      return undefined;
    }

    if (!Number.isFinite(everyAmount) || everyAmount <= 0) {
      this.depletionRuleError = 'El intervalo de durabilidad debe ser mayor a cero.';
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
      { emitEvent: false },
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
    options: { refreshArchived?: boolean } = {},
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
        }),
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

  private confirmAction(message: string): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    return window.confirm(message);
  }

  private promptDeleteConfirmation(expectedText: string): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    return window.prompt(
      `Esta eliminacion es permanente. Escribe exactamente "${expectedText}" para confirmar.`,
    );
  }

  private toOptionalNumber(value: number | string | null | undefined): number | undefined {
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
    metadata: ProductTypeShoppingMetadata | undefined,
  ): ProductTypeShoppingMetadata {
    return {
      buyOnlyOnPromo: false,
      ...metadata,
    };
  }

  private hasShoppingPriceEstimate(items: ShoppingPlanItem[]): boolean {
    return items.some((item) => item.estimatedLineTotal !== undefined);
  }

  private hasMissingShoppingPrices(items: ShoppingPlanItem[]): boolean {
    return items.some((item) => item.estimatedLineTotal === undefined);
  }

  private sumLotsByStatus(
    lots: PantryLotSummary[],
    statuses: ExpirationStatus[],
  ): number {
    return Number(
      lots
        .filter((lot) => statuses.includes(lot.expirationStatus))
        .reduce(
          (sum, lot) =>
            Number.isFinite(lot.quantity) ? sum + lot.quantity : sum,
          0,
        )
        .toFixed(2),
    );
  }
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}
