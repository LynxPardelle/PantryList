import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetArchivedPantryItemsUseCase } from '../../../application/use-cases/get-archived-pantry-items.use-case';
import { GetPantryOverviewUseCase } from '../../../application/use-cases/get-pantry-overview.use-case';
import { GetUserProfileUseCase } from '../../../application/use-cases/get-user-profile.use-case';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { ArchivedPantryItemsResponseDto } from '../dtos/archived-pantry-items-response.dto';
import { PantryExportResponseDto } from '../dtos/pantry-export-response.dto';
import { PantryOverviewResponseDto } from '../dtos/pantry-overview-response.dto';
import { InventoryLotMapper } from '../mappers/inventory-lot.mapper';
import { PantryOverviewMapper } from '../mappers/pantry-overview.mapper';
import { ProfileMapper } from '../mappers/profile.mapper';
import { ProductTypeMapper } from '../mappers/product-type.mapper';
import { ArchivedPantryItems } from '../../../application/read-models/archived-pantry-items.read-model';
import { InventoryLot } from '../../../domain/entities/inventory-lot.entity';
import { ProductType } from '../../../domain/entities/product-type.entity';

@Controller('pantry')
@ApiTags('pantry')
@UseGuards(AccessTokenGuard)
export class PantryController {
  constructor(
    private readonly getPantryOverviewUseCase: GetPantryOverviewUseCase,
    private readonly getArchivedPantryItemsUseCase: GetArchivedPantryItemsUseCase,
    private readonly getUserProfileUseCase: GetUserProfileUseCase,
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

  @Get('archived')
  @ApiOperation({ summary: 'Obtener elementos archivados de la despensa' })
  async archived(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<ArchivedPantryItemsResponseDto> {
    const archivedItems = await this.getArchivedPantryItemsUseCase.execute(
      currentUser.userId,
    );

    return this.toArchivedResponse(archivedItems);
  }

  @Get('export')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Exportar datos de PantryList del usuario' })
  async exportData(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<PantryExportResponseDto> {
    const [profile, overview, archivedItems] = await Promise.all([
      this.getUserProfileUseCase.execute(currentUser.userId),
      this.getPantryOverviewUseCase.execute(currentUser.userId),
      this.getArchivedPantryItemsUseCase.execute(currentUser.userId),
    ]);

    return {
      formatVersion: 1,
      exportedAt: new Date(),
      profile: ProfileMapper.toProfileResponse(profile),
      overview: PantryOverviewMapper.toResponse(overview),
      archived: this.toArchivedResponse(archivedItems),
    };
  }

  private toArchivedResponse(
    archivedItems: ArchivedPantryItems,
  ): ArchivedPantryItemsResponseDto {
    return {
      productTypes: archivedItems.productTypes.map((productType) =>
        ProductTypeMapper.toResponse(ProductType.fromPrimitives(productType)),
      ),
      inventoryLots: archivedItems.inventoryLots.map((lot) =>
        InventoryLotMapper.toResponse(InventoryLot.fromPrimitives(lot)),
      ),
    };
  }
}
