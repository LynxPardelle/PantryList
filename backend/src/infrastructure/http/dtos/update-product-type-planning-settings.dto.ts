import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateProductTypePlanningSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  planningEnabled?: boolean;

  @ApiPropertyOptional({ minimum: 1, maximum: 60 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  expirationWarningDaysOverride?: number;

  @ApiPropertyOptional({ minimum: 0.25, maximum: 4 })
  @IsOptional()
  @IsNumber()
  @Min(0.25)
  @Max(4)
  depletionWarningThresholdRatioOverride?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(30)
  shoppingPlanLeadDaysOverride?: number;
}
