import { QuantityUnit } from '../../domain/enums';
import { calculateDepletionForecast } from './depletion-forecast.service';

describe('calculateDepletionForecast', () => {
  it('calculates completed weekly intervals', () => {
    const forecast = calculateDepletionForecast(
      {
        enabled: true,
        consumeAmount: 2,
        unit: QuantityUnit.PIECE,
        everyAmount: 1,
        everyPeriod: 'week',
        anchorDate: new Date('2026-04-03T00:00:00.000Z'),
      },
      10,
      new Date('2026-04-24T12:00:00.000Z'),
    );

    expect(forecast).toMatchObject({
      completedIntervals: 3,
      estimatedConsumedQuantity: 6,
      estimatedCurrentQuantity: 4,
    });
  });

  it('does not consume before the first full interval completes', () => {
    const forecast = calculateDepletionForecast(
      {
        enabled: true,
        consumeAmount: 1,
        unit: QuantityUnit.LITER,
        everyAmount: 1,
        everyPeriod: 'month',
        anchorDate: new Date('2026-04-01T00:00:00.000Z'),
      },
      3,
      new Date('2026-04-24T12:00:00.000Z'),
    );

    expect(forecast).toMatchObject({
      completedIntervals: 0,
      estimatedConsumedQuantity: 0,
      estimatedCurrentQuantity: 3,
    });
  });

  it('floors estimated current quantity at zero', () => {
    const forecast = calculateDepletionForecast(
      {
        enabled: true,
        consumeAmount: 1,
        unit: QuantityUnit.LITER,
        everyAmount: 1,
        everyPeriod: 'month',
        anchorDate: new Date('2026-01-24T00:00:00.000Z'),
      },
      2,
      new Date('2026-04-24T12:00:00.000Z'),
    );

    expect(forecast).toMatchObject({
      completedIntervals: 3,
      estimatedConsumedQuantity: 3,
      estimatedCurrentQuantity: 0,
    });
  });

  it('returns undefined when the depletion rule is disabled or missing', () => {
    expect(calculateDepletionForecast(undefined, 10)).toBeUndefined();
    expect(
      calculateDepletionForecast(
        {
          enabled: false,
          consumeAmount: 1,
          unit: QuantityUnit.LITER,
          everyAmount: 1,
          everyPeriod: 'month',
          anchorDate: new Date('2026-01-24T00:00:00.000Z'),
        },
        10,
      ),
    ).toBeUndefined();
  });
});
