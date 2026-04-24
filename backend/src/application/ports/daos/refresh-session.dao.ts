import { RefreshSession } from '../../../domain/entities/refresh-session.entity';
import { RefreshSessionId } from '../../../domain/value-objects/refresh-session-id.vo';
import { UserId } from '../../../domain/value-objects/user-id.vo';

export interface RefreshSessionDao {
  save(session: RefreshSession): Promise<RefreshSession>;
  findById(id: RefreshSessionId): Promise<RefreshSession | null>;
  findByUserId(userId: UserId): Promise<RefreshSession[]>;
  revokeByUserId(userId: UserId): Promise<number>;
  deleteExpired(before: Date): Promise<number>;
}
