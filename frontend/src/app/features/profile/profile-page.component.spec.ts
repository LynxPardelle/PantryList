import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { AuthFacade } from '../../core/services/auth.facade';
import { ProfileService } from '../../core/services/profile.service';
import { ProfilePageComponent } from './profile-page.component';

describe('ProfilePageComponent', () => {
  let fixture: ComponentFixture<ProfilePageComponent>;
  let component: ProfilePageComponent;
  let profileService: jasmine.SpyObj<ProfileService>;

  beforeEach(async () => {
    profileService = jasmine.createSpyObj<ProfileService>('ProfileService', [
      'getProfile',
      'updatePreferences',
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
        },
      }),
    );
    profileService.updatePreferences.and.returnValue(
      of({
        expirationWarningDays: 7,
        showExpiredEntryAlert: true,
        depletionWarningThresholdRatio: 1,
        shoppingPlanLeadDays: 3,
      }),
    );

    await TestBed.configureTestingModule({
      imports: [ProfilePageComponent, ReactiveFormsModule, RouterTestingModule],
      providers: [
        {
          provide: ProfileService,
          useValue: profileService,
        },
        {
          provide: AuthFacade,
          useValue: {
            logout: jasmine.createSpy('logout'),
          },
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
    });
  });

  it('prevents saving invalid preference ranges', () => {
    component.preferencesForm.patchValue({
      expirationWarningDays: 0,
    });

    component.savePreferences();

    expect(profileService.updatePreferences).not.toHaveBeenCalled();
    expect(component.saveError).toContain('Revisa');
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
});
