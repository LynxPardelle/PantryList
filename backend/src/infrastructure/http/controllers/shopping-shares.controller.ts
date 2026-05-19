import {
  Controller,
  Get,
  GoneException,
  Header,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ShoppingShareExpiredError,
  ShoppingShareNotFoundError,
  ShoppingShareRevokedError,
} from '../../../application/use-cases/shopping-share.errors';
import { ResolveShoppingShareUseCase } from '../../../application/use-cases/shopping-share.use-cases';
import { ShoppingShare } from '../../../domain/entities/shopping-share.entity';
import { PublicShoppingShareResponseDto } from '../dtos/shopping-share-response.dto';

@Controller('shopping-shares')
@ApiTags('shopping-shares')
export class ShoppingSharesController {
  constructor(
    private readonly resolveShoppingShareUseCase: ResolveShoppingShareUseCase,
  ) {}

  @Get(':token')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Resolver una lista de compra compartida' })
  async resolve(
    @Param('token') token: string,
  ): Promise<PublicShoppingShareResponseDto> {
    try {
      return toPublicShoppingShareResponse(
        await this.resolveShoppingShareUseCase.execute(token),
      );
    } catch (error) {
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
