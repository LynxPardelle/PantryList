import { ProductType } from '../../../domain/entities/product-type.entity';
import { ProductTypeResponseDto } from '../dtos/product-type-response.dto';

export class ProductTypeMapper {
  static toResponse(productType: ProductType): ProductTypeResponseDto {
    const primitives = productType.toPrimitives();

    return {
      id: primitives.id,
      userId: primitives.userId,
      baseName: primitives.baseName,
      category: primitives.category,
      defaultUnit: primitives.defaultUnit,
      defaultDepletionRule: primitives.defaultDepletionRule,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };
  }
}
