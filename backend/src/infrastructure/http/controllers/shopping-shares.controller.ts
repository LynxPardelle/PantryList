import {
  Controller,
  Get,
  GoneException,
  Header,
  Logger,
  NotFoundException,
  Param,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import {
  ShoppingShareExpiredError,
  ShoppingShareNotFoundError,
  ShoppingShareRevokedError,
} from '../../../application/use-cases/shopping-share.errors';
import { ResolveShoppingShareUseCase } from '../../../application/use-cases/shopping-share.use-cases';
import { ShoppingShare } from '../../../domain/entities/shopping-share.entity';
import { PublicShoppingShareResponseDto } from '../dtos/shopping-share-response.dto';
import { getRequestId } from '../request-id';

@Controller('shopping-shares')
@ApiTags('shopping-shares')
export class ShoppingSharesController {
  private readonly logger = new Logger(ShoppingSharesController.name);

  constructor(
    private readonly resolveShoppingShareUseCase: ResolveShoppingShareUseCase,
  ) {}

  @Get(':token')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Resolver una lista de compra compartida' })
  async resolve(
    @Param('token') token: string,
    @Req() request: FastifyRequest,
  ): Promise<PublicShoppingShareResponseDto> {
    const requestId = getRequestId(request) ?? 'none';
    this.logger.log(
      `shopping_share_resolve_requested requestId=${requestId} tokenLength=${token.length}`,
    );

    try {
      const response = toPublicShoppingShareResponse(
        await this.resolveShoppingShareUseCase.execute(token),
      );
      this.logger.log(
        `shopping_share_resolve_completed requestId=${requestId}`,
      );

      return response;
    } catch (error) {
      this.logger.warn(
        `shopping_share_resolve_failed requestId=${requestId} error=${error instanceof Error ? error.constructor.name : 'UnknownError'}`,
      );
      throw mapPublicShoppingShareError(error);
    }
  }
}

function toPublicShoppingShareResponse(
  share: ShoppingShare,
): PublicShoppingShareResponseDto {
  const primitives = share.toPrimitives();

  return {
    text: primitives.text,
    createdAt: primitives.createdAt,
    expiresAt: primitives.expiresAt,
  };
}

function mapPublicShoppingShareError(error: unknown): Error {
  if (error instanceof ShoppingShareNotFoundError) {
    return new NotFoundException('Shopping share not found');
  }

  if (
    error instanceof ShoppingShareExpiredError ||
    error instanceof ShoppingShareRevokedError
  ) {
    return new GoneException('Shopping share expired or revoked');
  }

  return error instanceof Error ? error : new Error('Shopping share failed');
}
