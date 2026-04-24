import { BadRequestException } from '@nestjs/common';
import { ProductCategory, QuantityUnit } from '../../domain/enums';

export function parseQuantityUnit(value: string): QuantityUnit {
  const normalizedValue = value as QuantityUnit;
  const unit = Object.values(QuantityUnit).find(
    (candidate) => candidate === normalizedValue,
  );

  if (!unit) {
    throw new BadRequestException(`Unsupported quantity unit: ${value}`);
  }

  return unit;
}

export function parseProductCategory(value: string): ProductCategory {
  const normalizedValue = value as ProductCategory;
  const category = Object.values(ProductCategory).find(
    (candidate) => candidate === normalizedValue,
  );

  if (!category) {
    throw new BadRequestException(`Unsupported product category: ${value}`);
  }

  return category;
}
