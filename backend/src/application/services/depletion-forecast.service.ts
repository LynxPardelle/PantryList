import {
  DepletionPeriod,
  DepletionRulePrimitives,
} from '../../domain/entities/product-type.entity';

export interface DepletionForecast {
  depletionRule: DepletionRulePrimitives;
  recordedAvailableQuantity: number;
  completedIntervals: number;
  estimatedConsumedQuantity: number;
  estimatedCurrentQuantity: number;
  estimatedDepletionAt: Date;
}

export interface DepletionForecastInput {
  recordedAvailableQuantity: number;
  startDate?: Date;
}

export function calculateDepletionForecast(
  depletionRule: DepletionRulePrimitives | undefined,
  recordedAvailableQuantity: number,
  referenceDate: Date = new Date(),
): DepletionForecast | undefined {
  if (!depletionRule?.enabled) {
    return undefined;
  }

  const completedIntervals = countCompletedIntervals(
    depletionRule.anchorDate,
    referenceDate,
    depletionRule.everyAmount,
    depletionRule.everyPeriod,
  );
  const estimatedConsumedQuantity = roundQuantity(
    completedIntervals * depletionRule.consumeAmount,
  );
  const estimatedCurrentQuantity = Math.max(
    roundQuantity(recordedAvailableQuantity - estimatedConsumedQuantity),
    0,
  );
  const estimatedDepletionAt =
    estimatedCurrentQuantity <= 0
      ? new Date(referenceDate)
      : addIntervals(
          depletionRule.anchorDate,
          depletionRule.everyAmount *
            (completedIntervals +
              Math.ceil(
                estimatedCurrentQuantity / depletionRule.consumeAmount,
              )),
          depletionRule.everyPeriod,
        );

  return {
    depletionRule: cloneDepletionRule(depletionRule),
    recordedAvailableQuantity: roundQuantity(recordedAvailableQuantity),
    completedIntervals,
    estimatedConsumedQuantity,
    estimatedCurrentQuantity,
    estimatedDepletionAt,
  };
}

export function calculateGroupedDepletionForecast(
  depletionRule: DepletionRulePrimitives | undefined,
  inputs: DepletionForecastInput[],
  referenceDate: Date = new Date(),
): DepletionForecast | undefined {
  if (!depletionRule?.enabled) {
    return undefined;
  }

  if (inputs.length === 0) {
    return {
      depletionRule: cloneDepletionRule(depletionRule),
      recordedAvailableQuantity: 0,
      completedIntervals: 0,
      estimatedConsumedQuantity: 0,
      estimatedCurrentQuantity: 0,
      estimatedDepletionAt: new Date(referenceDate),
    };
  }

  const forecasts = inputs.map((input) =>
    calculateDepletionForecast(
      {
        ...depletionRule,
        anchorDate: input.startDate ?? depletionRule.anchorDate,
      },
      input.recordedAvailableQuantity,
      referenceDate,
    ),
  );

  const definedForecasts = forecasts.filter(
    (forecast): forecast is DepletionForecast => Boolean(forecast),
  );

  const recordedAvailableQuantity = roundQuantity(
    definedForecasts.reduce(
      (total, forecast) => total + forecast.recordedAvailableQuantity,
      0,
    ),
  );
  const estimatedConsumedQuantity = roundQuantity(
    definedForecasts.reduce(
      (total, forecast) => total + forecast.estimatedConsumedQuantity,
      0,
    ),
  );
  const estimatedCurrentQuantity = roundQuantity(
    definedForecasts.reduce(
      (total, forecast) => total + forecast.estimatedCurrentQuantity,
      0,
    ),
  );
  const estimatedDepletionAt =
    estimatedCurrentQuantity <= 0
      ? new Date(referenceDate)
      : new Date(
          Math.max(
            ...definedForecasts
              .filter((forecast) => forecast.estimatedCurrentQuantity > 0)
              .map((forecast) => forecast.estimatedDepletionAt.getTime()),
          ),
        );

  return {
    depletionRule: cloneDepletionRule(depletionRule),
    recordedAvailableQuantity,
    completedIntervals: Math.max(
      ...definedForecasts.map((forecast) => forecast.completedIntervals),
    ),
    estimatedConsumedQuantity,
    estimatedCurrentQuantity,
    estimatedDepletionAt,
  };
}

function countCompletedIntervals(
  anchorDate: Date,
  referenceDate: Date,
  everyAmount: number,
  everyPeriod: DepletionPeriod,
): number {
  if (referenceDate < anchorDate) {
    return 0;
  }

  let completedIntervals = 0;
  let nextIntervalDate = addIntervals(anchorDate, everyAmount, everyPeriod);

  while (nextIntervalDate <= referenceDate) {
    completedIntervals += 1;
    nextIntervalDate = addIntervals(
      anchorDate,
      everyAmount * (completedIntervals + 1),
      everyPeriod,
    );
  }

  return completedIntervals;
}

function addIntervals(
  anchorDate: Date,
  amount: number,
  period: DepletionPeriod,
): Date {
  const nextDate = new Date(anchorDate);

  if (period === 'day') {
    nextDate.setDate(nextDate.getDate() + amount);
    return nextDate;
  }

  if (period === 'week') {
    nextDate.setDate(nextDate.getDate() + amount * 7);
    return nextDate;
  }

  nextDate.setMonth(nextDate.getMonth() + amount);
  return nextDate;
}

function roundQuantity(value: number): number {
  return Number(value.toFixed(2));
}

function cloneDepletionRule(
  rule: DepletionRulePrimitives,
): DepletionRulePrimitives {
  return {
    ...rule,
    anchorDate: new Date(rule.anchorDate),
  };
}
