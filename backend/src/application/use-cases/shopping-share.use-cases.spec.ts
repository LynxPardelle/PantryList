import { ShoppingShare } from '../../domain/entities/shopping-share.entity';
import { ShoppingShareRepository } from '../../domain/repositories/shopping-share.repository';
import {
  CreateShoppingShareUseCase,
  ResolveShoppingShareUseCase,
  RevokeShoppingShareUseCase,
} from './shopping-share.use-cases';
import {
  ShoppingShareExpiredError,
  ShoppingShareRevokedError,
} from './shopping-share.errors';
import { hashShoppingShareToken } from '../utils/shopping-share-token';

describe('shopping share use cases', () => {
  let repository: jest.Mocked<ShoppingShareRepository>;

  beforeEach(() => {
    repository = {
      save: jest.fn(async (share) => share),
      findByTokenHash: jest.fn(),
      deleteByOwnerUserId: jest.fn(),
    };
  });

  it('creates an opaque revocable token and stores only its hash', async () => {
    const useCase = new CreateShoppingShareUseCase(repository);

    const result = await useCase.execute({
      ownerUserId: 'user-1',
      text: 'Lista de compras PantryList\n- Arroz: 2 kg',
    });

    const saved = repository.save.mock.calls[0][0].toPrimitives();
    expect(result.token).toEqual(expect.any(String));
    expect(result.token).not.toContain('Arroz');
    expect(saved.tokenHash).toBe(hashShoppingShareToken(result.token));
    expect(saved.text).toContain('Arroz: 2 kg');
    expect(saved.expiresAt.getTime() - saved.createdAt.getTime()).toBe(
      7 * 24 * 60 * 60 * 1000,
    );
  });

  it('resolves only active shares by token hash', async () => {
    const token = 'server-backed-token';
    const share = makeShare({
      tokenHash: hashShoppingShareToken(token),
      text: 'Lista visible',
    });
    repository.findByTokenHash.mockResolvedValue(share);
    const useCase = new ResolveShoppingShareUseCase(repository);

    const result = await useCase.execute(token);

    expect(repository.findByTokenHash).toHaveBeenCalledWith(
      hashShoppingShareToken(token),
    );
    expect(result.toPrimitives().text).toBe('Lista visible');
  });

  it('rejects expired and revoked shares during public resolution', async () => {
    const token = 'server-backed-token';
    const useCase = new ResolveShoppingShareUseCase(repository);

    repository.findByTokenHash.mockResolvedValueOnce(
      makeShare({
        tokenHash: hashShoppingShareToken(token),
        expiresAt: new Date('2020-05-26T00:00:00.000Z'),
      }),
    );
    await expect(useCase.execute(token)).rejects.toBeInstanceOf(
      ShoppingShareExpiredError,
    );

    repository.findByTokenHash.mockResolvedValueOnce(
      makeShare({
        tokenHash: hashShoppingShareToken(token),
        revokedAt: new Date('2026-05-20T00:00:00.000Z'),
      }),
    );
    await expect(useCase.execute(token)).rejects.toBeInstanceOf(
      ShoppingShareRevokedError,
    );
  });

  it('revokes only shares owned by the current user', async () => {
    const token = 'server-backed-token';
    repository.findByTokenHash.mockResolvedValue(
      makeShare({ tokenHash: hashShoppingShareToken(token) }),
    );
    const useCase = new RevokeShoppingShareUseCase(repository);

    const revoked = await useCase.execute({
      ownerUserId: 'user-1',
      token,
    });

    expect(revoked.toPrimitives().revokedAt).toBeInstanceOf(Date);
    expect(repository.save).toHaveBeenCalledWith(revoked);
  });

  it('rejects revocation attempts from a different owner', async () => {
    const token = 'server-backed-token';
    repository.findByTokenHash.mockResolvedValue(
      makeShare({ tokenHash: hashShoppingShareToken(token) }),
    );
    const useCase = new RevokeShoppingShareUseCase(repository);

    await expect(
      useCase.execute({
        ownerUserId: 'other-user',
        token,
      }),
    ).rejects.toThrow(/not owned/i);
  });
});

function makeShare(
  overrides: Partial<ReturnType<ShoppingShare['toPrimitives']>> = {},
): ShoppingShare {
  return ShoppingShare.fromPrimitives({
    id: 'share-1',
    ownerUserId: 'user-1',
    tokenHash: 'hash',
    text: 'Lista',
    createdAt: new Date('2026-05-19T00:00:00.000Z'),
    expiresAt: new Date('2099-05-26T00:00:00.000Z'),
    updatedAt: new Date('2026-05-19T00:00:00.000Z'),
    ...overrides,
  });
}
