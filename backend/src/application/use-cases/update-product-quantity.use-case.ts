import { Injectable } from '@nestjs/common';
import { Product } from '../../domain/entities/product.entity';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { SchedulingService } from '../../domain/services/scheduling.service';
import { ProductId } from '../../domain/value-objects/product-id.vo';

@Injectable()
export class UpdateProductQuantityUseCase {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly schedulingService: SchedulingService
  ) {}

  async execute(productId: string, newQuantity: number): Promise<Product> {
    const id = ProductId.fromString(productId);
    const product = await this.productRepository.findById(id);
    
    if (!product) {
      throw new Error('Product not found');
    }

    // Aplicar lógica de dominio
    product.updateQuantity(newQuantity);
    product.calculateNextPurchaseDate(this.schedulingService);

    // Persistir cambios
    return await this.productRepository.save(product);
  }
}
