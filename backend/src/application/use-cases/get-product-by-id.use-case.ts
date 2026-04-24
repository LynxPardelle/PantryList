import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PRODUCT_REPOSITORY } from '../tokens';
import { Product } from '../../domain/entities/product.entity';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { ProductId } from '../../domain/value-objects/product-id.vo';
import { UserId } from '../../domain/value-objects/user-id.vo';

@Injectable()
export class GetProductByIdUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(productId: string, userId: string): Promise<Product> {
    const product = await this.productRepository.findById(
      ProductId.fromString(productId),
    );

    if (!product || !product.userId.equals(UserId.fromString(userId))) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }
}
