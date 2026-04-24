import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { UserDao } from '../../../application/ports/daos';
import { User, UserPrimitives } from '../../../domain/entities/user.entity';
import { UserId } from '../../../domain/value-objects/user-id.vo';
import { UserDocument } from './schemas/user.schema';

type PersistedUser = UserPrimitives & {
  normalizedEmail: string;
  normalizedUsername: string;
};

@Injectable()
export class MongoUserDao implements UserDao {
  constructor(
    @InjectModel(UserDocument.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async save(user: User): Promise<User> {
    const primitives = user.toPrimitives();
    const normalizedEmail = normalizeEmail(primitives.email);
    const normalizedUsername = normalizeUsername(primitives.username);
    const savedUser = await this.userModel
      .findOneAndUpdate(
        { id: primitives.id },
        {
          ...primitives,
          normalizedEmail,
          normalizedUsername,
        },
        {
          new: true,
          upsert: true,
        },
      )
      .lean()
      .exec();

    return this.toDomain(savedUser);
  }

  async findById(id: UserId): Promise<User | null> {
    const user = await this.userModel
      .findOne({ id: id.toString() })
      .lean()
      .exec();

    return user ? this.toDomain(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.userModel
      .findOne({ normalizedEmail: normalizeEmail(email) })
      .lean()
      .exec();

    return user ? this.toDomain(user) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const user = await this.userModel
      .findOne({ normalizedUsername: normalizeUsername(username) })
      .lean()
      .exec();

    return user ? this.toDomain(user) : null;
  }

  async delete(id: UserId): Promise<void> {
    await this.userModel.deleteOne({ id: id.toString() }).exec();
  }

  private toDomain(user: PersistedUser): User {
    return User.fromPrimitives({
      id: user.id,
      email: user.email,
      username: user.username,
      status: user.status,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
    });
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLocaleLowerCase('en-US');
}

function normalizeUsername(username: string): string {
  return username.trim().toLocaleLowerCase('es');
}
