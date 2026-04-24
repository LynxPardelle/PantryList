import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConsumeInventoryLotUseCase } from '../../../application/use-cases/consume-inventory-lot.use-case';
import { CreateInventoryLotUseCase } from '../../../application/use-cases/create-inventory-lot.use-case';
import { GetExpiringLotsUseCase } from '../../../application/use-cases/get-expiring-lots.use-case';
import { ListInventoryLotsUseCase } from '../../../application/use-cases/list-inventory-lots.use-case';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { ConsumeInventoryLotDto } from '../dtos/consume-inventory-lot.dto';
import { CreateInventoryLotDto } from '../dtos/create-inventory-lot.dto';
import { ExpiringProductGroupResponseDto } from '../dtos/pantry-overview-response.dto';
import { InventoryLotResponseDto } from '../dtos/inventory-lot-response.dto';
import { InventoryLotMapper } from '../mappers/inventory-lot.mapper';
import { PantryOverviewMapper } from '../mappers/pantry-overview.mapper';

@Controller('inventory-lots')
@ApiTags('inventory-lots')
@UseGuards(AccessTokenGuard)
export class InventoryLotsController {
  constructor(
    private readonly createInventoryLotUseCase: CreateInventoryLotUseCase,
    private readonly listInventoryLotsUseCase: ListInventoryLotsUseCase,
    private readonly getExpiringLotsUseCase: GetExpiringLotsUseCase,
    private readonly consumeInventoryLotUseCase: ConsumeInventoryLotUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Registrar un lote de inventario' })
  async create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createInventoryLotDto: CreateInventoryLotDto,
  ): Promise<InventoryLotResponseDto> {
    const inventoryLot = await this.createInventoryLotUseCase.execute({
      userId: currentUser.userId,
      productTypeId: createInventoryLotDto.productTypeId,
      variantName: createInventoryLotDto.variantName,
      quantity: createInventoryLotDto.quantity,
      unit: createInventoryLotDto.unit,
      expiresAt: createInventoryLotDto.expiresAt
        ? new Date(createInventoryLotDto.expiresAt)
        : undefined,
      purchaseDate: createInventoryLotDto.purchaseDate
        ? new Date(createInventoryLotDto.purchaseDate)
        : undefined,
    });

    return InventoryLotMapper.toResponse(inventoryLot);
  }

  @Get()
  @ApiOperation({ summary: 'Listar lotes del usuario' })
  async list(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<InventoryLotResponseDto[]> {
    const lots = await this.listInventoryLotsUseCase.execute(
      currentUser.userId,
    );
    return lots.map((lot) => InventoryLotMapper.toResponse(lot));
  }

  @Get('expiring')
  @ApiOperation({
    summary: 'Listar lotes próximos a caducar agrupados por tipo base',
  })
  async expiring(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
  ): Promise<ExpiringProductGroupResponseDto[]> {
    if (days < 1) {
      throw new BadRequestException('days must be greater than zero');
    }

    const groups = await this.getExpiringLotsUseCase.execute(
      currentUser.userId,
      days,
    );

    return groups.map((group) =>
      PantryOverviewMapper.toExpiringGroupResponse(group),
    );
  }

  @Post(':id/consume')
  @ApiOperation({ summary: 'Consumir cantidad desde un lote específico' })
  async consume(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() consumeInventoryLotDto: ConsumeInventoryLotDto,
  ): Promise<InventoryLotResponseDto | null> {
    const inventoryLot = await this.consumeInventoryLotUseCase.execute(
      id,
      currentUser.userId,
      consumeInventoryLotDto.quantity,
    );

    return inventoryLot ? InventoryLotMapper.toResponse(inventoryLot) : null;
  }
}
