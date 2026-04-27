import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserDao } from '../ports/daos';
import { CognitoVerifiedClaims } from '../ports/cognito-auth.port';
import { USER_DAO } from '../tokens';
import { User } from '../../domain/entities/user.entity';
import { UserAccountStatus } from '../../domain/enums';
import { UserId } from '../../domain/value-objects/user-id.vo';

@Injectable()
export class CognitoProfileSyncService {
  constructor(
    @Inject(USER_DAO)
    private readonly userDao: UserDao,
  ) {}

  async syncFromClaims(claims: CognitoVerifiedClaims): Promise<User> {
    const email = claims.email?.trim().toLocaleLowerCase('en-US');

    if (!email) {
      throw new UnauthorizedException('Cognito email claim is required');
    }

    const userId = UserId.fromString(claims.sub);
    const existingUser = await this.userDao.findById(userId);
    const username = await this.resolveUsername(claims);
    const user =
      existingUser ??
      User.fromPrimitives({
        id: claims.sub,
        email,
        username,
        status: UserAccountStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    if (existingUser) {
      if (existingUser.email !== email) {
        existingUser.updateEmail(email);
      }

      if (existingUser.username !== username) {
        existingUser.updateUsername(username);
      }
    }

    return this.userDao.save(user);
  }

  private async resolveUsername(
    claims: CognitoVerifiedClaims,
  ): Promise<string> {
    const baseUsername = this.deriveUsername(claims);
    const usernameOwner = await this.userDao.findByUsername(baseUsername);

    if (
      !usernameOwner ||
      usernameOwner.id.equals(UserId.fromString(claims.sub))
    ) {
      return baseUsername;
    }

    return `${baseUsername}-${claims.sub.slice(0, 8)}`;
  }

  private deriveUsername(claims: CognitoVerifiedClaims): string {
    return (
      claims.preferredUsername?.trim() ||
      claims.name?.trim() ||
      claims.email?.split('@')[0]?.trim() ||
      claims.sub
    );
  }
}
