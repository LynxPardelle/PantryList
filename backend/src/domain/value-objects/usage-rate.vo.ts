import { Period } from '../enums/period.enum';

export class UsageRate {
  constructor(
    private readonly amount: number,
    private readonly period: Period
  ) {
    if (amount <= 0) {
      throw new Error('Usage rate amount must be positive');
    }
  }

  get Amount(): number { return this.amount; }
  get Period(): Period { return this.period; }

  toDailyUsage(): number {
    switch (this.period) {
      case Period.DAY: return this.amount;
      case Period.WEEK: return this.amount / 7;
      case Period.MONTH: return this.amount / 30;
      case Period.YEAR: return this.amount / 365;
      default: throw new Error(`Unsupported period: ${this.period}`);
    }
  }

  equals(other: UsageRate): boolean {
    return this.amount === other.amount && this.period === other.period;
  }
}
