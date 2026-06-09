import { QuantityUnit } from '../../domain/enums';
import { WasteReason } from '../../domain/entities/waste-event.entity';

export interface WasteOverview {
  userId: string;
  generatedAt: Date;
  windowDays: number;
  eventCount: number;
  estimatedLossTotal: number;
  totalQuantityByUnit: WasteQuantityTotal[];
  reasonBreakdown: WasteReasonSummary[];
  recentEvents: WasteEventSummary[];
}

export interface WasteQuantityTotal {
  unit: QuantityUnit;
  quantity: number;
}

export interface WasteReasonSummary {
  reason: WasteReason;
  eventCount: number;
  estimatedLossTotal: number;
}

export interface WasteEventSummary {
  id: string;
  productName: string;
  quantity: number;
  unit: QuantityUnit;
  reason: WasteReason;
  note?: string;
  estimatedLoss?: number;
  occurredAt: Date;
}
