import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateProductTypeUseCase } from '../../../application/use-cases/create-product-type.use-case';
import { GetProductTypeByIdUseCase } from '../../../application/use-cases/get-product-type-by-id.use-case';
import { SearchProductTypesUseCase } from '../../../application/use-cases/search-product-types.use-case';
import { CurrentUser } from '../auth/current-user.decorator';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CreateProductTypeDto } from '../dtos/create-product-type.dto';
import { ProductTypeResponseDto } from '../dtos/product-type-response.dto';
import { ProductTypeMapper } from '../mappers/product-type.mapper';

@Controller('product-types')
@ApiTags('product-types')
@UseGuards(AccessTokenGuard)
export class ProductTypesController {
  constructor(
    private readonly createProductTypeUseCase: CreateProductTypeUseCase,
    private readonly getProductTypeByIdUseCase: GetProductTypeByIdUseCase,
    private readonly searchProductTypesUseCase: SearchProductTypesUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear un tipo base de producto' })
  async create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createProductTypeDto: CreateProductTypeDto,
  ): Promise<ProductTypeResponseDto> {
    const productType = await this.createProductTypeUseCase.execute({
      userId: currentUser.userId,
      baseName: createProductTypeDto.baseName,
      category: createProductTypeDto.category,
      defaultUnit: createProductTypeDto.defaultUnit,
    });

    return ProductTypeMapper.toResponse(productType);
  }

  @Get()
  @ApiOperation({ summary: 'Buscar tipos base por usuario' })
  async search(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query('search') search?: string,
  ): Promise<ProductTypeResponseDto[]> {
    const productTypes = await this.searchProductTypesUseCase.execute(
      currentUser.userId,
      search,
    );

    return productTypes.map((productType) =>
      ProductTypeMapper.toResponse(productType),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener tipo base por identificador' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<ProductTypeResponseDto> {
    const productType = await this.getProductTypeByIdUseCase.execute(
      id,
      currentUser.userId,
    );
    return ProductTypeMapper.toResponse(productType);
  }
}
