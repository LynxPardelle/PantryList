import { Inject, Injectable } from '@nestjs/common';
import { ProductType } from '../../domain/entities/product-type.entity';
import { ProductTypeRepository } from '../../domain/repositories/product-type.repository';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { PRODUCT_TYPE_REPOSITORY } from '../tokens';

@Injectable()
export class SearchProductTypesUseCase {
  constructor(
    @Inject(PRODUCT_TYPE_REPOSITORY)
    private readonly productTypeRepository: ProductTypeRepository,
  ) {}

  async execute(userId: string, search?: string): Promise<ProductType[]> {
    return this.productTypeRepository.searchByUserId(
      UserId.fromString(userId),
      search?.trim() || undefined,
    );
  }
}
