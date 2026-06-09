import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { CreateProductUseCase } from '../../../application/use-cases/create-product.use-case';
import { GetProductByIdUseCase } from '../../../application/use-cases/get-product-by-id.use-case';
import { UpdateProductQuantityUseCase } from '../../../application/use-cases/update-product-quantity.use-case';
import { GetProductsByUserUseCase } from '../../../application/use-cases/get-products-by-user.use-case';
import { ResolveHouseholdPantryAccessUseCase } from '../../../application/use-cases/household.use-cases';
import { AuthCookieService } from '../auth/auth-cookie.service';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CreateProductDto } from '../dtos/create-product.dto';
import { UpdateQuantityDto } from '../dtos/update-quantity.dto';
import { ProductResponseDto } from '../dtos/product-response.dto';
import { ProductMapper } from '../mappers/product.mapper';
import { CreateProductCommand } from '../../../application/ports/commands/create-product.command';

@Controller('products')
@ApiTags('products')
@UseGuards(AccessTokenGuard)
export class ProductsController {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly getProductByIdUseCase: GetProductByIdUseCase,
    private readonly updateProductQuantityUseCase: UpdateProductQuantityUseCase,
    private readonly getProductsByUserUseCase: GetProductsByUserUseCase,
    private readonly resolveHouseholdPantryAccessUseCase: ResolveHouseholdPantryAccessUseCase,
    private readonly authCookieService: AuthCookieService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo producto' })
  async create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createProductDto: CreateProductDto,
    @Req() request: FastifyRequest,
  ): Promise<ProductResponseDto> {
    this.authCookieService.ensureXsrfForRequest(request);
    const access = await this.resolveHouseholdPantryAccessUseCase.executeWrite(
      currentUser.userId,
    );

    const command: CreateProductCommand = {
      userId: access.pantryOwnerUserId,
      title: createProductDto.title,
      currentQuantity: createProductDto.currentQuantity,
      unit: createProductDto.unit,
      usageRate: createProductDto.usageRate,
      category: createProductDto.category,
    };

    const product = await this.createProductUseCase.execute(command);
    return ProductMapper.toResponse(product);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener productos del usuario' })
  async findUserProducts(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<ProductResponseDto[]> {
    const access = await this.resolveHouseholdPantryAccessUseCase.executeRead(
      currentUser.userId,
    );
    const products = await this.getProductsByUserUseCase.execute(
      access.pantryOwnerUserId,
    );
    return products.map((product) => ProductMapper.toResponse(product));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener producto por identificador' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<ProductResponseDto> {
    const access = await this.resolveHouseholdPantryAccessUseCase.executeRead(
      currentUser.userId,
    );
    const product = await this.getProductByIdUseCase.execute(
      id,
      access.pantryOwnerUserId,
    );
    return ProductMapper.toResponse(product);
  }

  @Put(':id/quantity')
  @ApiOperation({ summary: 'Actualizar cantidad del producto' })
  async updateQuantity(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() updateQuantityDto: UpdateQuantityDto,
    @Req() request: FastifyRequest,
  ): Promise<ProductResponseDto> {
    this.authCookieService.ensureXsrfForRequest(request);
    const access = await this.resolveHouseholdPantryAccessUseCase.executeWrite(
      currentUser.userId,
    );

    const product = await this.updateProductQuantityUseCase.execute(
      id,
      access.pantryOwnerUserId,
      updateQuantityDto.quantity,
    );
    return ProductMapper.toResponse(product);
  }
}
