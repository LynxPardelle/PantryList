import { WasteEvent } from '../entities/waste-event.entity';
import { UserId } from '../value-objects/user-id.vo';

export interface WasteEventRepository {
  save(event: WasteEvent): Promise<WasteEvent>;
  findRecentByUserId(userId: UserId, limit?: number): Promise<WasteEvent[]>;
  findSinceByUserId(userId: UserId, since: Date): Promise<WasteEvent[]>;
  deleteByUserId(userId: UserId): Promise<number>;
}
