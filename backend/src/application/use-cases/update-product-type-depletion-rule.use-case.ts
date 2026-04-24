import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ProductType } from '../../domain/entities/product-type.entity';
import { ProductTypeRepository } from '../../domain/repositories/product-type.repository';
import { ProductTypeId } from '../../domain/value-objects/product-type-id.vo';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { PRODUCT_TYPE_REPOSITORY } from '../tokens';
import {
  DepletionRuleInput,
  parseDefaultDepletionRule,
} from '../utils/enum-parsers';

export interface UpdateProductTypeDepletionRuleCommand {
  productTypeId: string;
  userId: string;
  defaultDepletionRule: DepletionRuleInput;
}

@Injectable()
export class UpdateProductTypeDepletionRuleUseCase {
  constructor(
    @Inject(PRODUCT_TYPE_REPOSITORY)
    private readonly productTypeRepository: ProductTypeRepository,
  ) {}

  async execute(
    command: UpdateProductTypeDepletionRuleCommand,
  ): Promise<ProductType> {
    const productType = await this.productTypeRepository.findById(
      ProductTypeId.fromString(command.productTypeId),
    );

    if (
      !productType ||
      productType.userId.toString() !==
        UserId.fromString(command.userId).toString()
    ) {
      throw new NotFoundException('Product type not found');
    }

    productType.updateDefaultDepletionRule(
      parseDefaultDepletionRule(
        command.defaultDepletionRule,
        productType.defaultUnit,
      ),
    );

    return this.productTypeRepository.save(productType);
  }
}
