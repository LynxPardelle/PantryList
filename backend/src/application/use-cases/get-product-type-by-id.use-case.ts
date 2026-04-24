import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ProductType } from '../../domain/entities/product-type.entity';
import { ProductTypeRepository } from '../../domain/repositories/product-type.repository';
import { ProductTypeId } from '../../domain/value-objects/product-type-id.vo';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { PRODUCT_TYPE_REPOSITORY } from '../tokens';

@Injectable()
export class GetProductTypeByIdUseCase {
  constructor(
    @Inject(PRODUCT_TYPE_REPOSITORY)
    private readonly productTypeRepository: ProductTypeRepository,
  ) {}

  async execute(id: string, userId: string): Promise<ProductType> {
    const productType = await this.productTypeRepository.findById(
      ProductTypeId.fromString(id),
    );

    if (!productType || !productType.userId.equals(UserId.fromString(userId))) {
      throw new NotFoundException('Product type not found');
    }

    return productType;
  }
}
