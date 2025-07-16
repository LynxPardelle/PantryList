import { Product } from '../entities/product.entity';
import { ProductStatus } from '../enums';

export interface SchedulingService {
  calculateNextPurchaseDate(product: Product): Date;
  updateProductStatus(product: Product): ProductStatus;
  getDaysUntilPurchase(nextPurchaseDate: Date): number;
}

export class SchedulingDomainService implements SchedulingService {
  private readonly SAFETY_BUFFER = 0.8; // 20% buffer

  calculateNextPurchaseDate(product: Product): Date {
    const dailyUsage = product.usageRate.toDailyUsage();
    const daysRemaining = Math.floor(product.currentQuantity / dailyUsage);
    const safetyDays = Math.floor(daysRemaining * this.SAFETY_BUFFER);
    
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + safetyDays);
    
    return nextDate;
  }

  updateProductStatus(product: Product): ProductStatus {
    if (!product.nextPurchaseDate) {
      return ProductStatus.AVAILABLE;
    }

    const daysUntilPurchase = this.getDaysUntilPurchase(product.nextPurchaseDate);
    
    if (daysUntilPurchase <= 0) {
      return ProductStatus.OUT_OF_STOCK;
    } else if (daysUntilPurchase <= 3) {
      return ProductStatus.LOW_STOCK;
    } else {
      return ProductStatus.AVAILABLE;
    }
  }

  getDaysUntilPurchase(nextPurchaseDate: Date): number {
    const today = new Date();
    const diffTime = nextPurchaseDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
