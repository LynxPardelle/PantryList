import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetPantryOverviewUseCase } from '../../../application/use-cases/get-pantry-overview.use-case';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PantryOverviewResponseDto } from '../dtos/pantry-overview-response.dto';
import { PantryOverviewMapper } from '../mappers/pantry-overview.mapper';

@Controller('pantry')
@ApiTags('pantry')
@UseGuards(AccessTokenGuard)
export class PantryController {
  constructor(
    private readonly getPantryOverviewUseCase: GetPantryOverviewUseCase,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Obtener overview agrupado de la despensa' })
  async overview(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<PantryOverviewResponseDto> {
    const overview = await this.getPantryOverviewUseCase.execute(
      currentUser.userId,
    );
    return PantryOverviewMapper.toResponse(overview);
  }
}
