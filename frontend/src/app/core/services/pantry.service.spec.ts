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
      items: [],
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
          urgency: 'upcoming',
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
    });
  });
});
