import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { ProductType } from '../../domain/entities/product-type.entity';
import { ProductTypeRepository } from '../../domain/repositories/product-type.repository';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { PRODUCT_TYPE_REPOSITORY } from '../tokens';
import { parseProductCategory, parseQuantityUnit } from '../utils/enum-parsers';

export interface CreateProductTypeCommand {
  userId: string;
  baseName: string;
  category: string;
  defaultUnit: string;
}

@Injectable()
export class CreateProductTypeUseCase {
  constructor(
    @Inject(PRODUCT_TYPE_REPOSITORY)
    private readonly productTypeRepository: ProductTypeRepository,
  ) {}

  async execute(command: CreateProductTypeCommand): Promise<ProductType> {
    const userId = UserId.fromString(command.userId);
    const existingProductType = await this.productTypeRepository.findByBaseName(
      userId,
      command.baseName,
    );

    if (existingProductType) {
      throw new ConflictException('Product type already exists for this user');
    }

    const productType = ProductType.create(
      userId,
      command.baseName,
      parseProductCategory(command.category),
      parseQuantityUnit(command.defaultUnit),
    );

    return this.productTypeRepository.save(productType);
  }
}
