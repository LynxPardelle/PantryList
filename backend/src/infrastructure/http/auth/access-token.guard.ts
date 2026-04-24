import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { JWT_SESSION_SERVICE, USER_DAO } from '../../../application/tokens';
import { JwtSessionService } from '../../../application/ports/jwt-session.port';
import { UserDao } from '../../../application/ports/daos';
import { AuthenticatedUser } from './authenticated-user.interface';
import { AuthCookieService } from './auth-cookie.service';
import { UserId } from '../../../domain/value-objects/user-id.vo';
import { UserAccountStatus } from '../../../domain/enums';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    @Inject(JWT_SESSION_SERVICE)
    private readonly jwtSessionService: JwtSessionService,
    @Inject(USER_DAO)
    private readonly userDao: UserDao,
    private readonly authCookieService: AuthCookieService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<
      FastifyRequest & {
        authUser?: AuthenticatedUser;
      }
    >();
    const accessToken =
      this.authCookieService.getAccessTokenFromRequest(request);

    if (!accessToken) {
      throw new UnauthorizedException('Access token is required');
    }

    const claims = await this.jwtSessionService.verifyAccessToken(accessToken);
    const user = await this.userDao.findById(UserId.fromString(claims.sub));

    if (!user || user.status !== UserAccountStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid authenticated user');
    }

    this.authCookieService.ensureXsrfForRequest(request);
    request.authUser = {
      userId: claims.sub,
      sessionId: claims.sid,
    };

    return true;
  }
}
