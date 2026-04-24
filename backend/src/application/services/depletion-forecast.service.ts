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
