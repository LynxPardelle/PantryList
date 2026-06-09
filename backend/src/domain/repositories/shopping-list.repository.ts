import { ShoppingList } from '../entities/shopping-list.entity';
import { UserId } from '../value-objects/user-id.vo';

export interface ShoppingListRepository {
  save(list: ShoppingList): Promise<ShoppingList>;
  findById(id: string): Promise<ShoppingList | null>;
  listByOwnerUserId(ownerUserId: string): Promise<ShoppingList[]>;
  delete(id: string): Promise<void>;
  deleteByOwnerUserId(userId: UserId): Promise<number>;
}
