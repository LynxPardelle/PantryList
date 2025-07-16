import { Controller, Post, Get, Put, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CreateProductUseCase } from '../../../application/use-cases/create-product.use-case';
import { UpdateProductQuantityUseCase } from '../../../application/use-cases/update-product-quantity.use-case';
import { GetProductsByUserUseCase } from '../../../application/use-cases/get-products-by-user.use-case';
import { CreateProductDto } from '../dtos/create-product.dto';
import { UpdateQuantityDto } from '../dtos/update-quantity.dto';
import { ProductResponseDto } from '../dtos/product-response.dto';
import { ProductMapper } from '../mappers/product.mapper';
import { CreateProductCommand } from '../../../application/ports/commands/create-product.command';

@Controller('products')
@ApiTags('products')
export class ProductsController {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly updateProductQuantityUseCase: UpdateProductQuantityUseCase,
    private readonly getProductsByUserUseCase: GetProductsByUserUseCase
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo producto' })
  async create(@Body() createProductDto: CreateProductDto): Promise<ProductResponseDto> {
    const command: CreateProductCommand = {
      userId: createProductDto.userId,
      title: createProductDto.title,
      currentQuantity: createProductDto.currentQuantity,
      unit: createProductDto.unit,
      usageRate: createProductDto.usageRate,
      category: createProductDto.category
    };

    const product = await this.createProductUseCase.execute(command);
    return ProductMapper.toResponse(product);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener productos del usuario' })
  async findUserProducts(@Query('userId') userId: string): Promise<ProductResponseDto[]> {
    const products = await this.getProductsByUserUseCase.execute(userId);
    return products.map(ProductMapper.toResponse);
  }

  @Put(':id/quantity')
  @ApiOperation({ summary: 'Actualizar cantidad del producto' })
  async updateQuantity(
    @Param('id') id: string,
    @Body() updateQuantityDto: UpdateQuantityDto
  ): Promise<ProductResponseDto> {
    const product = await this.updateProductQuantityUseCase.execute(
      id, 
      updateQuantityDto.quantity
    );
    return ProductMapper.toResponse(product);
  }
}
