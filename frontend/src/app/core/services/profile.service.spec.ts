import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  let service: ProfileService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(ProfileService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('loads the current profile and normalizes dates', () => {
    let createdAt: Date | undefined;

    service.getProfile().subscribe((profile) => {
      createdAt = profile.createdAt;
      expect(profile.preferences.expirationWarningDays).toBe(10);
    });

    const request = http.expectOne('/api/profile');
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBeTrue();
    request.flush({
      id: 'user-1',
      email: 'chef@example.com',
      username: 'chef',
      status: 'active',
      connectedIdentityCount: 2,
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-02T00:00:00.000Z',
      preferences: {
        expirationWarningDays: 10,
        showExpiredEntryAlert: true,
        depletionWarningThresholdRatio: 1.5,
        shoppingPlanLeadDays: 5,
        showGuidanceTips: true,
      },
    });

    expect(createdAt).toEqual(new Date('2026-04-01T00:00:00.000Z'));
  });

  it('patches preferences and returns the updated preferences', () => {
    service
      .updatePreferences({ showExpiredEntryAlert: false })
      .subscribe((preferences) => {
        expect(preferences.showExpiredEntryAlert).toBe(false);
      });

    const request = http.expectOne('/api/profile/preferences');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.withCredentials).toBeTrue();
    expect(request.request.body).toEqual({
      showExpiredEntryAlert: false,
    });
    request.flush({
      expirationWarningDays: 7,
      showExpiredEntryAlert: false,
      depletionWarningThresholdRatio: 1,
      shoppingPlanLeadDays: 3,
      showGuidanceTips: true,
    });
  });

  it('deletes local pantry data with explicit confirmation', () => {
    service
      .deletePantryData({ confirmationText: 'ELIMINAR' })
      .subscribe((result) => {
        expect(result).toEqual({
          deletedInventoryLotCount: 5,
          deletedProductTypeCount: 3,
          deletedShoppingShareCount: 2,
        });
      });

    const request = http.expectOne('/api/profile/pantry-data');
    expect(request.request.method).toBe('DELETE');
    expect(request.request.withCredentials).toBeTrue();
    expect(request.request.body).toEqual({
      confirmationText: 'ELIMINAR',
    });
    request.flush({
      deletedInventoryLotCount: 5,
      deletedProductTypeCount: 3,
      deletedShoppingShareCount: 2,
    });
  });
});
