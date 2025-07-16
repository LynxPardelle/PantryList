import { User } from '../entities/user.entity';
import { UserId } from '../value-objects/user-id.vo';

export interface UserRepository {
  save(user: User): Promise<User>;
  findById(id: UserId): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  delete(id: UserId): Promise<void>;
}
