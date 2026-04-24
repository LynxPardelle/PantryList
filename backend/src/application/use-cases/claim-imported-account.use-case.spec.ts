import { ConflictException } from '@nestjs/common';
import { ClaimImportedAccountUseCase } from './claim-imported-account.use-case';
import {
  LegacyAccountClaimDao,
  PasswordCredentialDao,
  UserDao,
} from '../ports/daos';
import { PasswordHasher } from '../ports/password-hasher.port';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { ProductTypeRepository } from '../../domain/repositories/product-type.repository';
import { InventoryLotRepository } from '../../domain/repositories/inventory-lot.repository';
import {
  AuthSessionService,
  AuthSessionTokens,
} from '../services/auth-session.service';
import { LegacyAccountClaim } from '../../domain/entities/legacy-account-claim.entity';
import { PasswordCredential } from '../../domain/entities/password-credential.entity';
import { RefreshSession } from '../../domain/entities/refresh-session.entity';
import { User } from '../../domain/entities/user.entity';
import { RefreshSessionId } from '../../domain/value-objects/refresh-session-id.vo';

describe('ClaimImportedAccountUseCase', () => {
  const makeLegacyAccountClaimDao = (): jest.Mocked<LegacyAccountClaimDao> => ({
    save: jest.fn(),
    findByLegacyUsername: jest.fn(),
    findAllUnclaimed: jest.fn(),
  });

  const makeUserDao = (): jest.Mocked<UserDao> => ({
    save: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByUsername: jest.fn(),
    delete: jest.fn(),
  });

  const makePasswordCredentialDao = (): jest.Mocked<PasswordCredentialDao> => ({
    save: jest.fn(),
    findByUserId: jest.fn(),
    deleteByUserId: jest.fn(),
  });

  const makePasswordHasher = (): jest.Mocked<PasswordHasher> => ({
    hash: jest.fn(),
    verify: jest.fn(),
  });

  const makeProductRepository = (): jest.Mocked<ProductRepository> => ({
    save: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findByCategory: jest.fn(),
    findByStatus: jest.fn(),
    reassignUserOwnership: jest.fn(),
    delete: jest.fn(),
    findAll: jest.fn(),
  });

  const makeProductTypeRepository = (): jest.Mocked<ProductTypeRepository> => ({
    save: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    searchByUserId: jest.fn(),
    findByBaseName: jest.fn(),
    reassignUserOwnership: jest.fn(),
  });

  const makeInventoryLotRepository =
    (): jest.Mocked<InventoryLotRepository> => ({
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByProductTypeId: jest.fn(),
      reassignUserOwnership: jest.fn(),
      delete: jest.fn(),
    });

  const makeAuthSessionService = (): jest.Mocked<AuthSessionService> =>
    ({
      issueForUser: jest.fn(),
    }) as unknown as jest.Mocked<AuthSessionService>;

  const makeUseCase = (overrides?: {
    legacyAccountClaimDao?: jest.Mocked<LegacyAccountClaimDao>;
    userDao?: jest.Mocked<UserDao>;
    passwordCredentialDao?: jest.Mocked<PasswordCredentialDao>;
    passwordHasher?: jest.Mocked<PasswordHasher>;
    productRepository?: jest.Mocked<ProductRepository>;
    productTypeRepository?: jest.Mocked<ProductTypeRepository>;
    inventoryLotRepository?: jest.Mocked<InventoryLotRepository>;
    authSessionService?: jest.Mocked<AuthSessionService>;
  }) => {
    const legacyAccountClaimDao =
      overrides?.legacyAccountClaimDao ?? makeLegacyAccountClaimDao();
    const userDao = overrides?.userDao ?? makeUserDao();
    const passwordCredentialDao =
      overrides?.passwordCredentialDao ?? makePasswordCredentialDao();
    const passwordHasher = overrides?.passwordHasher ?? makePasswordHasher();
    const productRepository =
      overrides?.productRepository ?? makeProductRepository();
    const productTypeRepository =
      overrides?.productTypeRepository ?? makeProductTypeRepository();
    const inventoryLotRepository =
      overrides?.inventoryLotRepository ?? makeInventoryLotRepository();
    const authSessionService =
      overrides?.authSessionService ?? makeAuthSessionService();

    return {
      useCase: new ClaimImportedAccountUseCase(
        legacyAccountClaimDao,
        userDao,
        passwordCredentialDao,
        passwordHasher,
        productRepository,
        productTypeRepository,
        inventoryLotRepository,
        authSessionService,
      ),
      legacyAccountClaimDao,
      userDao,
      passwordCredentialDao,
      passwordHasher,
      productRepository,
      productTypeRepository,
      inventoryLotRepository,
      authSessionService,
    };
  };

  const makeClaimingClaim = (legacyUsername = 'legacy-chef') => {
    const claim = LegacyAccountClaim.create(legacyUsername);
    claim.markClaiming();
    return claim;
  };

  const makeUser = (overrides?: { email?: string; username?: string }) =>
    User.create(
      overrides?.email ?? 'chef@pantrylist.dev',
      overrides?.username ?? 'chef-nuevo',
    );

  const command = {
    legacyUsername: 'legacy-chef',
    email: 'chef@pantrylist.dev',
    password: 'StrongPassword123',
    finalUsername: 'chef-nuevo',
    userAgent: 'jest',
    ipAddress: '127.0.0.1',
  };

  it('resumes a claiming account when the user and credential already exist', async () => {
    const {
      useCase,
      legacyAccountClaimDao,
      userDao,
      passwordCredentialDao,
      passwordHasher,
      productRepository,
      productTypeRepository,
      inventoryLotRepository,
      authSessionService,
    } = makeUseCase();
    const claim = makeClaimingClaim(command.legacyUsername);
    const user = makeUser({
      email: command.email,
      username: command.finalUsername,
    });
    const credential = PasswordCredential.create(user.id, 'stored-hash');
    const session: AuthSessionTokens = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      xsrfToken: 'xsrf-token',
      refreshSession: RefreshSession.createWithId(
        RefreshSessionId.generate(),
        user.id,
        'stored-refresh-hash',
        new Date(Date.now() + 60_000),
      ),
    };

    legacyAccountClaimDao.findByLegacyUsername.mockResolvedValue(claim);
    legacyAccountClaimDao.save.mockImplementation((savedClaim) =>
      Promise.resolve(savedClaim),
    );
    userDao.findByEmail.mockResolvedValue(user);
    userDao.findByUsername.mockResolvedValue(user);
    passwordCredentialDao.findByUserId.mockResolvedValue(credential);
    passwordHasher.verify.mockResolvedValue(true);
    productRepository.reassignUserOwnership.mockResolvedValue(1);
    productTypeRepository.reassignUserOwnership.mockResolvedValue(1);
    inventoryLotRepository.reassignUserOwnership.mockResolvedValue(1);
    authSessionService.issueForUser.mockResolvedValue(session);

    const result = await useCase.execute(command);

    expect(passwordHasher.verify.mock.calls).toEqual([
      [credential.passwordHash, command.password],
    ]);
    expect(passwordCredentialDao.save.mock.calls).toHaveLength(0);
    expect(userDao.save.mock.calls).toHaveLength(0);
    expect(productRepository.reassignUserOwnership.mock.calls[0]?.[1]).toBe(
      user.id,
    );
    expect(productTypeRepository.reassignUserOwnership.mock.calls[0]?.[1]).toBe(
      user.id,
    );
    expect(
      inventoryLotRepository.reassignUserOwnership.mock.calls[0]?.[1],
    ).toBe(user.id);
    expect(legacyAccountClaimDao.save.mock.calls).toHaveLength(1);
    expect(legacyAccountClaimDao.save.mock.calls[0]?.[0]?.status).toBe(
      'claimed',
    );
    expect(result.user).toBe(user);
    expect(result.session).toBe(session);
  });

  it('rejects a claiming retry when the password credential is missing', async () => {
    const {
      useCase,
      legacyAccountClaimDao,
      userDao,
      passwordCredentialDao,
      productRepository,
      productTypeRepository,
      inventoryLotRepository,
    } = makeUseCase();
    const claim = makeClaimingClaim(command.legacyUsername);
    const user = makeUser({
      email: command.email,
      username: command.finalUsername,
    });

    legacyAccountClaimDao.findByLegacyUsername.mockResolvedValue(claim);
    userDao.findByEmail.mockResolvedValue(user);
    userDao.findByUsername.mockResolvedValue(user);
    passwordCredentialDao.findByUserId.mockResolvedValue(null);

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(useCase.execute(command)).rejects.toThrow(
      'Legacy account claim could not be resumed safely',
    );
    expect(passwordCredentialDao.save.mock.calls).toHaveLength(0);
    expect(productRepository.reassignUserOwnership.mock.calls).toHaveLength(0);
    expect(productTypeRepository.reassignUserOwnership.mock.calls).toHaveLength(
      0,
    );
    expect(
      inventoryLotRepository.reassignUserOwnership.mock.calls,
    ).toHaveLength(0);
  });

  it('rejects a claiming retry when it cannot be resumed safely', async () => {
    const { useCase, legacyAccountClaimDao, userDao } = makeUseCase();
    const claim = makeClaimingClaim(command.legacyUsername);

    legacyAccountClaimDao.findByLegacyUsername.mockResolvedValue(claim);
    userDao.findByEmail.mockResolvedValue(null);
    userDao.findByUsername.mockResolvedValue(null);

    await expect(useCase.execute(command)).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(useCase.execute(command)).rejects.toThrow(
      'Legacy account claim is already in progress',
    );
  });
});
