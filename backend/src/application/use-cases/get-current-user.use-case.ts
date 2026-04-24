import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { USER_DAO } from '../tokens';
import { UserDao } from '../ports/daos';
import { User } from '../../domain/entities/user.entity';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { UserAccountStatus } from '../../domain/enums';

@Injectable()
export class GetCurrentUserUseCase {
  constructor(
    @Inject(USER_DAO)
    private readonly userDao: UserDao,
  ) {}

  async execute(userId: string): Promise<User> {
    const user = await this.userDao.findById(UserId.fromString(userId));

    if (!user || user.status !== UserAccountStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid authenticated user');
    }

    return user;
  }
}
