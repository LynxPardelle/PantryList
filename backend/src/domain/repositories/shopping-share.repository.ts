import { ShoppingShare } from '../entities/shopping-share.entity';
import { UserId } from '../value-objects/user-id.vo';

export interface ShoppingShareRepository {
  save(share: ShoppingShare): Promise<ShoppingShare>;
  findByTokenHash(tokenHash: string): Promise<ShoppingShare | null>;
  deleteByOwnerUserId(userId: UserId): Promise<number>;
}
