import { ApiProperty } from '@nestjs/swagger';

export class ProductTypeDepletionRuleResponseDto {
  @ApiProperty()
  enabled: boolean;

  @ApiProperty()
  consumeAmount: number;

  @ApiProperty()
  unit: string;

  @ApiProperty()
  everyAmount: number;

  @ApiProperty()
  everyPeriod: string;

  @ApiProperty()
  anchorDate: Date;
}

export class ProductTypeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  baseName: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  defaultUnit: string;

  @ApiProperty({ required: false, type: ProductTypeDepletionRuleResponseDto })
  defaultDepletionRule?: ProductTypeDepletionRuleResponseDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
