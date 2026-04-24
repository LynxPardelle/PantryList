import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Product } from '../../domain/entities/product.entity';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { SchedulingService } from '../../domain/services/scheduling.service';
import { ProductId } from '../../domain/value-objects/product-id.vo';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { PRODUCT_REPOSITORY, SCHEDULING_SERVICE } from '../tokens';

@Injectable()
export class UpdateProductQuantityUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
    @Inject(SCHEDULING_SERVICE)
    private readonly schedulingService: SchedulingService,
  ) {}

  async execute(
    productId: string,
    userId: string,
    newQuantity: number,
  ): Promise<Product> {
    const id = ProductId.fromString(productId);
    const product = await this.productRepository.findById(id);

    if (!product || !product.userId.equals(UserId.fromString(userId))) {
      throw new NotFoundException('Product not found');
    }

    // Aplicar lógica de dominio
    product.updateQuantity(newQuantity);
    product.calculateNextPurchaseDate(this.schedulingService);

    // Persistir cambios
    return await this.productRepository.save(product);
  }
}
