import { Injectable } from '@nestjs/common';
import { Product } from '../../domain/entities/product.entity';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { UserId } from '../../domain/value-objects/user-id.vo';

@Injectable()
export class GetProductsByUserUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(userId: string): Promise<Product[]> {
    const userIdVO = UserId.fromString(userId);
    return await this.productRepository.findByUserId(userIdVO);
  }
}
