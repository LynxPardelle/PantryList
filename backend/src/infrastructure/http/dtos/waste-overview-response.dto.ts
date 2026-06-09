import { ApiProperty } from '@nestjs/swagger';

export class WasteQuantityTotalResponseDto {
  @ApiProperty()
  unit: string;

  @ApiProperty()
  quantity: number;
}

export class WasteReasonSummaryResponseDto {
  @ApiProperty()
  reason: string;

  @ApiProperty()
  eventCount: number;

  @ApiProperty()
  estimatedLossTotal: number;
}

export class WasteEventSummaryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  productName: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unit: string;

  @ApiProperty()
  reason: string;

  @ApiProperty({ required: false })
  note?: string;

  @ApiProperty({ required: false })
  estimatedLoss?: number;

  @ApiProperty()
  occurredAt: Date;
}

export class WasteOverviewResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  generatedAt: Date;

  @ApiProperty()
  windowDays: number;

  @ApiProperty()
  eventCount: number;

  @ApiProperty()
  estimatedLossTotal: number;

  @ApiProperty({ type: [WasteQuantityTotalResponseDto] })
  totalQuantityByUnit: WasteQuantityTotalResponseDto[];

  @ApiProperty({ type: [WasteReasonSummaryResponseDto] })
  reasonBreakdown: WasteReasonSummaryResponseDto[];

  @ApiProperty({ type: [WasteEventSummaryResponseDto] })
  recentEvents: WasteEventSummaryResponseDto[];
}
