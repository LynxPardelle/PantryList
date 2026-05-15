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
  PACKAGE = 'paquete',
  CAN = 'lata',
  BAG = 'bolsa',
  BOTTLE = 'botella',
  BOX = 'caja',
  DOZEN = 'docena',
  BUNCH = 'manojo',
  HALF_KILO = 'medio kilo',
  QUARTER_KILO = 'cuarto kilo',
  ROLL = 'rollo',
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
