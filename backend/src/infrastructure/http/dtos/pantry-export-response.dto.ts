import { ApiProperty } from '@nestjs/swagger';
import { ArchivedPantryItemsResponseDto } from './archived-pantry-items-response.dto';
import { PantryOverviewResponseDto } from './pantry-overview-response.dto';
import { UserProfileResponseDto } from './profile-response.dto';

export class PantryExportResponseDto {
  @ApiProperty({ example: 1 })
  formatVersion: 1;

  @ApiProperty()
  exportedAt: Date;

  @ApiProperty({ type: UserProfileResponseDto })
  profile: UserProfileResponseDto;

  @ApiProperty({ type: PantryOverviewResponseDto })
  overview: PantryOverviewResponseDto;

  @ApiProperty({ type: ArchivedPantryItemsResponseDto })
  archived: ArchivedPantryItemsResponseDto;
}
