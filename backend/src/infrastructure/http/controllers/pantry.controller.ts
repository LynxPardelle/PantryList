import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  GoneException,
  Get,
  Header,
  Logger,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { CloseShoppingPurchaseUseCase } from '../../../application/use-cases/close-shopping-purchase.use-case';
import { GetArchivedPantryItemsUseCase } from '../../../application/use-cases/get-archived-pantry-items.use-case';
import { GetPantryOverviewUseCase } from '../../../application/use-cases/get-pantry-overview.use-case';
import { GetUserProfileUseCase } from '../../../application/use-cases/get-user-profile.use-case';
import {
  CreateShoppingShareUseCase,
  RevokeShoppingShareUseCase,
} from '../../../application/use-cases/shopping-share.use-cases';
import { ShoppingShareNotFoundError } from '../../../application/use-cases/shopping-share.errors';
import {
  MAX_ACTIVE_INVENTORY_LOTS_PER_USER,
  MAX_ACTIVE_PRODUCT_TYPES_PER_USER,
  MAX_ARCHIVED_INVENTORY_LOTS_PER_USER,
  MAX_ARCHIVED_PRODUCT_TYPES_PER_USER,
  MAX_INVENTORY_LOTS_PER_PRODUCT_TYPE,
  MAX_PRODUCT_TYPE_SEARCH_RESULTS,
  MAX_SHOPPING_CHECKOUT_ITEMS,
} from '../../../application/constants/query-limits';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AuthCookieService } from '../auth/auth-cookie.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { ArchivedPantryItemsResponseDto } from '../dtos/archived-pantry-items-response.dto';
import { CheckoutPantryDto } from '../dtos/checkout-pantry.dto';
import { CreateShoppingShareDto } from '../dtos/create-shopping-share.dto';
import { InventoryLotResponseDto } from '../dtos/inventory-lot-response.dto';
import {
  PantryDataLimitsResponseDto,
  PantryExportResponseDto,
} from '../dtos/pantry-export-response.dto';
import { PantryOverviewResponseDto } from '../dtos/pantry-overview-response.dto';
import { ShoppingShareResponseDto } from '../dtos/shopping-share-response.dto';
import { getRequestId } from '../request-id';
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
  private readonly logger = new Logger(PantryController.name);

  constructor(
    private readonly getPantryOverviewUseCase: GetPantryOverviewUseCase,
    private readonly getArchivedPantryItemsUseCase: GetArchivedPantryItemsUseCase,
    private readonly getUserProfileUseCase: GetUserProfileUseCase,
    private readonly closeShoppingPurchaseUseCase: CloseShoppingPurchaseUseCase,
    private readonly createShoppingShareUseCase: CreateShoppingShareUseCase,
    private readonly revokeShoppingShareUseCase: RevokeShoppingShareUseCase,
    private readonly authCookieService: AuthCookieService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Obtener overview agrupado de la despensa' })
  async overview(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Req() request: FastifyRequest,
  ): Promise<PantryOverviewResponseDto> {
    const requestId = getRequestId(request) ?? 'none';
    this.logger.log(
      `pantry_overview_requested requestId=${requestId} userId=${currentUser.userId}`,
    );
    const overview = await this.getPantryOverviewUseCase.execute(
      currentUser.userId,
    );
    const response = PantryOverviewMapper.toResponse(overview);
    this.logger.log(
      `pantry_overview_completed requestId=${requestId} userId=${currentUser.userId} itemCount=${response.items.length}`,
    );
    return response;
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
    @Req() request: FastifyRequest,
  ): Promise<PantryExportResponseDto> {
    const requestId = getRequestId(request) ?? 'none';
    this.logger.log(
      `pantry_export_requested requestId=${requestId} userId=${currentUser.userId}`,
    );
    const [profile, overview, archivedItems] = await Promise.all([
      this.getUserProfileUseCase.execute(currentUser.userId),
      this.getPantryOverviewUseCase.execute(currentUser.userId),
      this.getArchivedPantryItemsUseCase.execute(currentUser.userId),
    ]);

    const response: PantryExportResponseDto = {
      formatVersion: 1,
      exportedAt: new Date(),
      profile: ProfileMapper.toProfileResponse(profile),
      overview: PantryOverviewMapper.toResponse(overview),
      archived: this.toArchivedResponse(archivedItems),
      limits: this.getPantryDataLimits(),
    };
    this.logger.log(
      `pantry_export_completed requestId=${requestId} userId=${currentUser.userId}`,
    );
    return response;
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Cerrar una compra y registrar lotes' })
  async checkout(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CheckoutPantryDto,
    @Req() request: FastifyRequest,
  ): Promise<InventoryLotResponseDto[]> {
    this.authCookieService.ensureXsrfForRequest(request);
    const requestId = getRequestId(request) ?? 'none';
    this.logger.log(
      `pantry_checkout_requested requestId=${requestId} userId=${currentUser.userId} itemCount=${dto.items.length}`,
    );

    const inventoryLots = await this.closeShoppingPurchaseUseCase.execute({
      userId: currentUser.userId,
      items: dto.items.map((item) => ({
        productTypeId: item.productTypeId,
        variantName: item.variantName,
        quantity: item.quantity,
        unit: item.unit,
        paidUnitPrice: item.paidUnitPrice,
        shoppingLocation: item.shoppingLocation,
        expiresAt: item.expiresAt ? new Date(item.expiresAt) : undefined,
      })),
    });

    this.logger.log(
      `pantry_checkout_completed requestId=${requestId} userId=${currentUser.userId} createdLotCount=${inventoryLots.length}`,
    );

    return inventoryLots.map((lot) => InventoryLotMapper.toResponse(lot));
  }

  @Post('shopping-shares')
  @ApiOperation({ summary: 'Crear enlace temporal de lista de compra' })
  async createShoppingShare(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateShoppingShareDto,
    @Req() request: FastifyRequest,
  ): Promise<ShoppingShareResponseDto> {
    this.authCookieService.ensureXsrfForRequest(request);
    const requestId = getRequestId(request) ?? 'none';
    this.logger.log(
      `shopping_share_create_requested requestId=${requestId} userId=${currentUser.userId} textLength=${dto.text.length}`,
    );

    const result = await this.createShoppingShareUseCase.execute({
      ownerUserId: currentUser.userId,
      text: dto.text,
    });
    const response = this.toShoppingShareResponse(result.share, result.token);
    this.logger.log(
      `shopping_share_create_completed requestId=${requestId} userId=${currentUser.userId}`,
    );

    return response;
  }

  @Delete('shopping-shares/:token')
  @ApiOperation({ summary: 'Revocar enlace temporal de lista de compra' })
  async revokeShoppingShare(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('token') token: string,
    @Req() request: FastifyRequest,
  ): Promise<ShoppingShareResponseDto> {
    this.authCookieService.ensureXsrfForRequest(request);
    const requestId = getRequestId(request) ?? 'none';
    this.logger.log(
      `shopping_share_revoke_requested requestId=${requestId} userId=${currentUser.userId}`,
    );

    try {
      const share = await this.revokeShoppingShareUseCase.execute({
        ownerUserId: currentUser.userId,
        token,
      });
      this.logger.log(
        `shopping_share_revoke_completed requestId=${requestId} userId=${currentUser.userId}`,
      );

      return this.toShoppingShareResponse(share);
    } catch (error) {
      throw mapShoppingShareMutationError(error);
    }
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

  private getPantryDataLimits(): PantryDataLimitsResponseDto {
    return {
      activeProductTypesPerUser: MAX_ACTIVE_PRODUCT_TYPES_PER_USER,
      archivedProductTypesPerUser: MAX_ARCHIVED_PRODUCT_TYPES_PER_USER,
      productTypeSearchResults: MAX_PRODUCT_TYPE_SEARCH_RESULTS,
      activeInventoryLotsPerUser: MAX_ACTIVE_INVENTORY_LOTS_PER_USER,
      archivedInventoryLotsPerUser: MAX_ARCHIVED_INVENTORY_LOTS_PER_USER,
      inventoryLotsPerProductType: MAX_INVENTORY_LOTS_PER_PRODUCT_TYPE,
      shoppingCheckoutItems: MAX_SHOPPING_CHECKOUT_ITEMS,
    };
  }

  private toShoppingShareResponse(
    share: {
      toPrimitives: () => {
        createdAt: Date;
        expiresAt: Date;
        revokedAt?: Date;
      };
    },
    token?: string,
  ): ShoppingShareResponseDto {
    const primitives = share.toPrimitives();

    return {
      token,
      createdAt: primitives.createdAt,
      expiresAt: primitives.expiresAt,
      revokedAt: primitives.revokedAt,
    };
  }
}

function mapShoppingShareMutationError(error: unknown): Error {
  if (error instanceof ShoppingShareNotFoundError) {
    return new NotFoundException('Shopping share not found');
  }

  if (error instanceof Error && /not owned/i.test(error.message)) {
    return new ForbiddenException(
      'Shopping share is not owned by current user',
    );
  }

  if (error instanceof Error && /expired|revoked/i.test(error.message)) {
    return new GoneException('Shopping share expired or revoked');
  }

  return error instanceof Error ? error : new Error('Shopping share failed');
}
