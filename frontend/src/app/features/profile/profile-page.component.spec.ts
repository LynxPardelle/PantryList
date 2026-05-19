import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { AuthFacade } from '../../core/services/auth.facade';
import { PantryService } from '../../core/services/pantry.service';
import { ProfileService } from '../../core/services/profile.service';
import { ProfilePageComponent } from './profile-page.component';

describe('ProfilePageComponent', () => {
  let fixture: ComponentFixture<ProfilePageComponent>;
  let component: ProfilePageComponent;
  let authFacade: jasmine.SpyObj<AuthFacade>;
  let profileService: jasmine.SpyObj<ProfileService>;
  let pantryService: jasmine.SpyObj<PantryService>;

  beforeEach(async () => {
    authFacade = jasmine.createSpyObj<AuthFacade>('AuthFacade', ['logout']);
    profileService = jasmine.createSpyObj<ProfileService>('ProfileService', [
      'getProfile',
      'updatePreferences',
      'deletePantryData',
    ]);
    profileService.getProfile.and.returnValue(
      of({
        id: 'user-1',
        email: 'chef@example.com',
        username: 'chef',
        status: 'active',
        connectedIdentityCount: 2,
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-02T00:00:00.000Z'),
        preferences: {
          expirationWarningDays: 10,
          showExpiredEntryAlert: false,
          depletionWarningThresholdRatio: 1.5,
          shoppingPlanLeadDays: 5,
          showGuidanceTips: false,
        },
      }),
    );
    profileService.updatePreferences.and.returnValue(
      of({
        expirationWarningDays: 7,
        showExpiredEntryAlert: true,
        depletionWarningThresholdRatio: 1,
        shoppingPlanLeadDays: 3,
        showGuidanceTips: true,
      }),
    );
    profileService.deletePantryData.and.returnValue(
      of({
        deletedInventoryLotCount: 5,
        deletedProductTypeCount: 3,
        deletedShoppingShareCount: 2,
      }),
    );
    pantryService = jasmine.createSpyObj<PantryService>('PantryService', [
      'exportPantryData',
    ]);
    pantryService.exportPantryData.and.returnValue(
      of({
        formatVersion: 1,
        exportedAt: '2026-05-17T00:00:00.000Z',
        profile: {
          id: 'user-1',
          email: 'chef@example.com',
          username: 'chef',
          status: 'active',
          connectedIdentityCount: 2,
          createdAt: '2026-04-01T00:00:00.000Z',
          updatedAt: '2026-04-02T00:00:00.000Z',
          preferences: {
            expirationWarningDays: 10,
            showExpiredEntryAlert: false,
            depletionWarningThresholdRatio: 1.5,
            shoppingPlanLeadDays: 5,
            showGuidanceTips: false,
          },
        },
        overview: {
          userId: 'user-1',
          generatedAt: '2026-05-17T00:00:00.000Z',
          preferences: {
            expirationWarningDays: 10,
            showExpiredEntryAlert: false,
            depletionWarningThresholdRatio: 1.5,
            shoppingPlanLeadDays: 5,
            showGuidanceTips: false,
          },
          items: [],
          expiringItems: [],
          depletingItems: [],
          shoppingPlanItems: [],
          shoppingPlanEstimatedTotal: 0,
        },
        archived: {
          productTypes: [],
          inventoryLots: [],
        },
        limits: {
          activeProductTypesPerUser: 500,
          archivedProductTypesPerUser: 250,
          productTypeSearchResults: 25,
          activeInventoryLotsPerUser: 1000,
          archivedInventoryLotsPerUser: 250,
          inventoryLotsPerProductType: 500,
          shoppingCheckoutItems: 50,
        },
      }),
    );

    await TestBed.configureTestingModule({
      imports: [ProfilePageComponent, ReactiveFormsModule, RouterTestingModule],
      providers: [
        {
          provide: AuthFacade,
          useValue: authFacade,
        },
        {
          provide: ProfileService,
          useValue: profileService,
        },
        {
          provide: PantryService,
          useValue: pantryService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfilePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders account summary and loaded preferences', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('chef@example.com');
    expect(component.preferencesForm.getRawValue()).toEqual({
      expirationWarningDays: 10,
      showExpiredEntryAlert: false,
      depletionWarningThresholdRatio: 1.5,
      shoppingPlanLeadDays: 5,
      showGuidanceTips: false,
    });
  });

  it('renders clear privacy and data lifecycle boundaries', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Ciclo de vida de datos');
    expect(compiled.textContent).toContain(
      'La identidad Cognito se gestiona por separado',
    );
    expect(compiled.textContent).toContain(
      'Exportar datos no crea permisos compartidos',
    );
  });

  it('prevents saving invalid preference ranges', () => {
    component.preferencesForm.patchValue({
      expirationWarningDays: 0,
    });

    component.savePreferences();

    expect(profileService.updatePreferences).not.toHaveBeenCalled();
    expect(component.saveError).toContain('Revisa');
  });

  it('delegates logout to the auth facade', () => {
    component.logout();

    expect(authFacade.logout).toHaveBeenCalled();
  });

  it('keeps the form editable when the preference update fails', () => {
    profileService.updatePreferences.and.returnValue(
      throwError(() => new Error('API failed')),
    );

    component.preferencesForm.patchValue({
      shoppingPlanLeadDays: 6,
    });
    component.savePreferences();

    expect(component.preferencesForm.enabled).toBeTrue();
    expect(component.saveError).toBe('API failed');
  });

  it('downloads a portable pantry export', () => {
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:pantry-export');
    spyOn(window.URL, 'revokeObjectURL');
    spyOn(HTMLAnchorElement.prototype, 'click').and.stub();

    component.exportPantryData();

    expect(pantryService.exportPantryData).toHaveBeenCalled();
    expect(component.exportMessage).toBe('Export listo.');
  });

  it('shows an error when pantry export fails', () => {
    pantryService.exportPantryData.and.returnValue(
      throwError(() => new Error('Export failed')),
    );

    component.exportPantryData();

    expect(component.exportError).toBe('Export failed');
  });

  it('shows an error when pantry export download cannot be prepared', () => {
    spyOn(window.URL, 'createObjectURL').and.throwError('Blob failed');

    component.exportPantryData();

    expect(component.exportMessage).toBeNull();
    expect(component.exportError).toBe('Blob failed');
  });

  it('requires ELIMINAR confirmation before deleting local pantry data', () => {
    expect(component.canDeletePantryData).toBeFalse();

    component.deletePantryDataForm.patchValue({
      confirmationText: 'BORRAR',
    });

    expect(component.canDeletePantryData).toBeFalse();

    component.deletePantryData();

    expect(profileService.deletePantryData).not.toHaveBeenCalled();
    expect(component.deleteError).toContain('ELIMINAR');

    component.deletePantryDataForm.patchValue({
      confirmationText: 'ELIMINAR',
    });

    expect(component.canDeletePantryData).toBeTrue();

    component.deletePantryData();

    expect(profileService.deletePantryData).toHaveBeenCalledWith({
      confirmationText: 'ELIMINAR',
    });
    expect(component.deleteMessage).toBe(
      'Datos eliminados: 5 lotes, 3 tipos base y 2 enlaces compartidos.',
    );
  });

  it('keeps the pantry deletion button disabled until the exact confirmation is entered', () => {
    fixture.detectChanges();

    const deleteButton = fixture.nativeElement.querySelector(
      '.danger-panel button[type="submit"]',
    ) as HTMLButtonElement;

    expect(deleteButton.disabled).toBeTrue();

    component.deletePantryDataForm.patchValue({
      confirmationText: 'ELIMINAR',
    });
    fixture.detectChanges();

    expect(deleteButton.disabled).toBeFalse();
  });
});
