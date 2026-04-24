import { User } from '../../../domain/entities/user.entity';
import { AuthUserResponseDto } from '../dtos/auth-user-response.dto';

export class AuthUserMapper {
  static toResponse(user: User): AuthUserResponseDto {
    return {
      id: user.id.toString(),
      email: user.email,
      username: user.username,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
