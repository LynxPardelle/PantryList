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
  ExpirationStatus,
  PRODUCT_CATEGORIES,
  PRODUCT_UNITS,
  ProductCategory,
  ProductType,
  ProductTypeSelectionMode,
  ProductUnit,
} from '../../shared/models/pantry.model';
import * as PantryActions from '../../store/pantry/pantry.actions';
import {
  selectExpiringGroups,
  selectPantryError,
  selectPantryGroupsSorted,
  selectPantryLoading,
  selectPantrySummary,
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
  readonly pantryGroups$ = this.store.select(selectPantryGroupsSorted);

  readonly searchingTypeSuggestions$ = new BehaviorSubject(false);
  readonly selectionModeOptions: ProductTypeSelectionMode[] = ['existing', 'new'];
  readonly categoryOptions = PRODUCT_CATEGORIES;
  readonly unitOptions = PRODUCT_UNITS;

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
              }
            : undefined,
        variantName: rawValue.variantName.trim() || undefined,
        quantity,
        unit:
          selectionMode === 'existing'
            ? (this.selectedExistingType?.defaultUnit ?? rawValue.unit)
            : rawValue.unit,
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
    });
  }

  private loadOverview(): void {
    this.store.dispatch(PantryActions.loadPantryOverview());
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
