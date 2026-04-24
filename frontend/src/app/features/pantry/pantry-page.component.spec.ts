import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Subject } from 'rxjs';
import { Store } from '@ngrx/store';
import { AuthFacade } from '../../core/services/auth.facade';
import { PantryPageComponent } from './pantry-page.component';
import { PantryService } from '../../core/services/pantry.service';
import { ProductType } from '../../shared/models/pantry.model';

describe('PantryPageComponent', () => {
  let fixture: ComponentFixture<PantryPageComponent>;
  let component: PantryPageComponent;
  let pantryService: jasmine.SpyObj<PantryService>;
  let authFacade: AuthFacadeStub;

  beforeEach(async () => {
    pantryService = jasmine.createSpyObj<PantryService>('PantryService', [
      'searchProductTypes',
      'registerLot',
      'consumeInventoryLot',
    ]);
    pantryService.searchProductTypes.and.returnValue(of([]));
    pantryService.registerLot.and.returnValue(of({} as any));
    pantryService.consumeInventoryLot.and.returnValue(of(null));
    authFacade = new AuthFacadeStub();

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
          useValue: {
            select: () => of(null),
            dispatch: jasmine.createSpy('dispatch'),
          },
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
});

class AuthFacadeStub {
  readonly currentUsername$ = of('tester');

  logout(): void {
    // no-op
  }
}
