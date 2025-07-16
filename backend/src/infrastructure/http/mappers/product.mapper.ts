import { Product } from '../../../domain/entities/product.entity';
import { ProductResponseDto } from '../dtos/product-response.dto';

export class ProductMapper {
  static toResponse(product: Product): ProductResponseDto {
    const primitives = product.toPrimitives();
    return {
      id: primitives.id,
      userId: primitives.userId,
      title: primitives.title,
      currentQuantity: primitives.currentQuantity,
      unit: primitives.unit,
      usageRate: primitives.usageRate,
      category: primitives.category,
      status: primitives.status,
      nextPurchaseDate: primitives.nextPurchaseDate,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt
    };
  }
}
