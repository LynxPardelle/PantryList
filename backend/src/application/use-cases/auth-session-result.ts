import { User } from '../../domain/entities/user.entity';
import { AuthSessionTokens } from '../services/auth-session.service';

export interface AuthSessionResult {
  user: User;
  session: AuthSessionTokens;
}
