import { PasswordResetToken } from '../../../domain/entities/password-reset-token.entity';

export interface PasswordResetTokenDao {
  save(token: PasswordResetToken): Promise<PasswordResetToken>;
  findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null>;
  deleteExpired(before: Date): Promise<number>;
}
