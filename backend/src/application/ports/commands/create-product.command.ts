export interface CreateProductCommand {
  userId: string;
  title: string;
  currentQuantity: number;
  unit: string;
  usageRate: {
    amount: number;
    period: string;
  };
  category: string;
}
