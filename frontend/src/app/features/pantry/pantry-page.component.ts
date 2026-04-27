import {
  ChangeDetectionStrategy,
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
import { BehaviorSubject, of } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  startWith,
  switchMap,
} from 'rxjs/operators';
import { AuthFacade } from '../../core/services/auth.facade';
import { PantryService } from '../../core/services/pantry.service';
import {
  DEPLETION_PERIODS,
  DepletionPeriod,
  ExpirationStatus,
  PRODUCT_CATEGORIES,
  PRODUCT_UNITS,
  ProductCategory,
  PantryOverviewItem,
  ProductTypeDepletionRuleRequest,
  ProductType,
  ProductTypeSelectionMode,
  ProductUnit,
  ShoppingPlanUrgency,
} from '../../shared/models/pantry.model';
import * as PantryActions from '../../store/pantry/pantry.actions';
import {
  selectExpiringGroups,
  selectDepletingGroups,
  selectPantryError,
  selectPantryGroupsSorted,
  selectPantryLoading,
  selectPantrySummary,
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

  readonly username$ = this.authFacade.currentUsername$;
  readonly loading$ = this.store.select(selectPantryLoading);
  readonly error$ = this.store.select(selectPantryError);
  readonly summary$ = this.store.select(selectPantrySummary);
  readonly expiringGroups$ = this.store.select(selectExpiringGroups);
  readonly depletingGroups$ = this.store.select(selectDepletingGroups);
  readonly shoppingPlanItems$ = this.store.select(selectShoppingPlanItems);
  readonly pantryGroups$ = this.store.select(selectPantryGroupsSorted);

  readonly searchingTypeSuggestions$ = new BehaviorSubject(false);
  readonly selectionModeOptions: ProductTypeSelectionMode[] = ['existing', 'new'];
  readonly categoryOptions = PRODUCT_CATEGORIES;
  readonly unitOptions = PRODUCT_UNITS;
  readonly depletionPeriodOptions = DEPLETION_PERIODS;

  readonly categoryLabels: Record<ProductCategory, string> = {
    food: 'Comida',
    cleaning: 'Limpieza',
    hygiene: 'Higiene',
    other: 'Otros',
  };

  readonly expirationLabels: Record<ExpirationStatus, string> = {
    critical: 'Critico',
    soon: 'Proximo',
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
    critical: 'Esta semana',
    upcoming: 'Próxima compra',
  };

  readonly lotForm = this.formBuilder.nonNullable.group({
    selectionMode: ['existing' as ProductTypeSelectionMode, Validators.required],
    existingTypeSearch: [''],
    existingProductTypeId: [''],
    newBaseName: ['', [Validators.maxLength(80)]],
    category: ['food' as ProductCategory, Validators.required],
    unit: ['piezas' as ProductUnit, Validators.required],
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

    this.submittingLot = true;
    this.registerError = null;
    const lotUnit =
      selectionMode === 'existing'
        ? (this.selectedExistingType?.defaultUnit ?? rawValue.unit)
        : rawValue.unit;
    const defaultDepletionRule = this.buildDefaultDepletionRule(rawValue, lotUnit);

    if (rawValue.enableDurability && !defaultDepletionRule) {
      return;
    }

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

  logout(): void {
    this.authFacade.logout();
  }

  trackByProductTypeId(_: number, productType: { productTypeId: string }): string {
    return productType.productTypeId;
  }

  trackByLotId(_: number, lot: { lotId: string }): string {
    return lot.lotId;
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
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}
