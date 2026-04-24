import { PasswordCredential } from '../../../domain/entities/password-credential.entity';
import { UserId } from '../../../domain/value-objects/user-id.vo';

export interface PasswordCredentialDao {
  save(credential: PasswordCredential): Promise<PasswordCredential>;
  findByUserId(userId: UserId): Promise<PasswordCredential | null>;
  deleteByUserId(userId: UserId): Promise<void>;
}
