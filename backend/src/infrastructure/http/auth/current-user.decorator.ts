import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { AuthenticatedUser } from './authenticated-user.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<
      FastifyRequest & {
        authUser?: AuthenticatedUser;
      }
    >();

    if (!request.authUser) {
      throw new Error('Authenticated user not found in request context');
    }

    return request.authUser;
  },
);
