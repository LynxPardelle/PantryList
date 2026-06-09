import { Inject, Injectable } from '@nestjs/common';
import { WasteEventRepository } from '../../domain/repositories/waste-event.repository';
import { UserId } from '../../domain/value-objects/user-id.vo';
import {
  WasteOverview,
  WasteQuantityTotal,
  WasteReasonSummary,
} from '../read-models/waste-overview.read-model';
import { WASTE_EVENT_REPOSITORY } from '../tokens';

const WINDOW_DAYS = 30;
const RECENT_EVENT_LIMIT = 10;

@Injectable()
export class GetWasteOverviewUseCase {
  constructor(
    @Inject(WASTE_EVENT_REPOSITORY)
    private readonly wasteEventRepository: WasteEventRepository,
  ) {}

  async execute(
    userId: string,
    referenceDate = new Date(),
  ): Promise<WasteOverview> {
    const normalizedUserId = UserId.fromString(userId);
    const since = new Date(
      referenceDate.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );
    const [windowEvents, recentEvents] = await Promise.all([
      this.wasteEventRepository.findSinceByUserId(normalizedUserId, since),
      this.wasteEventRepository.findRecentByUserId(
        normalizedUserId,
        RECENT_EVENT_LIMIT,
      ),
    ]);
    const quantityByUnit = new Map<string, WasteQuantityTotal>();
    const reasonBreakdown = new Map<string, WasteReasonSummary>();
    let estimatedLossTotal = 0;

    windowEvents.forEach((event) => {
      const primitives = event.toPrimitives();
      const unitTotal = quantityByUnit.get(primitives.unit) ?? {
        unit: primitives.unit,
        quantity: 0,
      };
      unitTotal.quantity = roundMetric(
        unitTotal.quantity + primitives.quantity,
      );
      quantityByUnit.set(primitives.unit, unitTotal);

      const reasonSummary = reasonBreakdown.get(primitives.reason) ?? {
        reason: primitives.reason,
        eventCount: 0,
        estimatedLossTotal: 0,
      };
      reasonSummary.eventCount += 1;
      reasonSummary.estimatedLossTotal = roundMetric(
        reasonSummary.estimatedLossTotal + (primitives.estimatedLoss ?? 0),
      );
      reasonBreakdown.set(primitives.reason, reasonSummary);
      estimatedLossTotal += primitives.estimatedLoss ?? 0;
    });

    return {
      userId,
      generatedAt: referenceDate,
      windowDays: WINDOW_DAYS,
      eventCount: windowEvents.length,
      estimatedLossTotal: roundMetric(estimatedLossTotal),
      totalQuantityByUnit: Array.from(quantityByUnit.values()),
      reasonBreakdown: Array.from(reasonBreakdown.values()).sort(
        (left, right) => right.eventCount - left.eventCount,
      ),
      recentEvents: recentEvents.map((event) => {
        const primitives = event.toPrimitives();

        return {
          id: primitives.id,
          productName: primitives.productName,
          quantity: primitives.quantity,
          unit: primitives.unit,
          reason: primitives.reason,
          note: primitives.note,
          estimatedLoss: primitives.estimatedLoss,
          occurredAt: primitives.occurredAt,
        };
      }),
    };
  }
}

function roundMetric(value: number): number {
  return Number(value.toFixed(2));
}
