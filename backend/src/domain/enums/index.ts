export enum ProductStatus {
  AVAILABLE = 'available',
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock',
}

export enum QuantityUnit {
  LITER = 'lt',
  KILOGRAM = 'kg',
  GRAM = 'g',
  PIECE = 'piezas',
  MILLILITER = 'ml',
}

export enum ProductCategory {
  FOOD = 'food',
  CLEANING = 'cleaning',
  HYGIENE = 'hygiene',
  OTHER = 'other',
}

export enum ExpirationStatus {
  EXPIRED = 'expired',
  CRITICAL = 'critical',
  SOON = 'soon',
  STABLE = 'stable',
  NONE = 'none',
}

export enum UserAccountStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
}
