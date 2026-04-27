import { UnauthorizedException } from '@nestjs/common';
import { UserDao } from '../ports/daos';
import { CognitoProfileSyncService } from './cognito-profile-sync.service';
import { User } from '../../domain/entities/user.entity';
import { UserAccountStatus } from '../../domain/enums';

describe('CognitoProfileSyncService', () => {
  const makeUserDao = (): jest.Mocked<UserDao> => ({
    save: jest.fn((user) => Promise.resolve(user)),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByUsername: jest.fn(),
    delete: jest.fn(),
  });

  const makeService = (userDao = makeUserDao()) => ({
    service: new CognitoProfileSyncService(userDao),
    userDao,
  });

  const makeUser = (overrides?: {
    id?: string;
    email?: string;
    username?: string;
    status?: UserAccountStatus;
  }) =>
    User.fromPrimitives({
      id: overrides?.id ?? 'cognito-sub-existing',
      email: overrides?.email ?? 'old@example.com',
      username: overrides?.username ?? 'old-name',
      status: overrides?.status ?? UserAccountStatus.ACTIVE,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });

  it('creates a local app profile with Cognito sub as User.id', async () => {
    const { service, userDao } = makeService();
    userDao.findById.mockResolvedValue(null);
    userDao.findByUsername.mockResolvedValue(null);

    const user = await service.syncFromClaims({
      sub: 'cognito-sub-123',
      email: 'CHEF@Example.COM',
      preferredUsername: 'Chef',
    });

    expect(user.id.toString()).toBe('cognito-sub-123');
    expect(user.email).toBe('chef@example.com');
    expect(user.username).toBe('Chef');
    expect(userDao.save.mock.calls[0]?.[0]).toBe(user);
  });

  it('updates an existing local profile without changing disabled status', async () => {
    const { service, userDao } = makeService();
    const existing = makeUser({
      id: 'cognito-sub-disabled',
      status: UserAccountStatus.DISABLED,
    });
    userDao.findById.mockResolvedValue(existing);
    userDao.findByUsername.mockResolvedValue(null);

    const user = await service.syncFromClaims({
      sub: 'cognito-sub-disabled',
      email: 'new@example.com',
      name: 'Nuevo Nombre',
    });

    expect(user.email).toBe('new@example.com');
    expect(user.username).toBe('Nuevo Nombre');
    expect(user.status).toBe(UserAccountStatus.DISABLED);
  });

  it('rejects Cognito claims without an email', async () => {
    const { service } = makeService();

    await expect(
      service.syncFromClaims({
        sub: 'cognito-sub-no-email',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('adds a stable suffix when the derived username is already owned by another user', async () => {
    const { service, userDao } = makeService();
    const otherUser = makeUser({
      id: 'different-sub',
      email: 'other@example.com',
      username: 'chef',
    });
    userDao.findById.mockResolvedValue(null);
    userDao.findByUsername.mockImplementation((username) =>
      Promise.resolve(username === 'chef' ? otherUser : null),
    );

    const user = await service.syncFromClaims({
      sub: '1234567890abcdef',
      email: 'chef@example.com',
    });

    expect(user.username).toBe('chef-12345678');
  });

  it('keeps the derived username when it belongs to the same Cognito user', async () => {
    const { service, userDao } = makeService();
    const existing = makeUser({
      id: 'same-sub',
      email: 'same@example.com',
      username: 'chef',
    });
    userDao.findById.mockResolvedValue(existing);
    userDao.findByUsername.mockImplementation((username) =>
      Promise.resolve(username === 'chef' ? existing : null),
    );

    const user = await service.syncFromClaims({
      sub: 'same-sub',
      email: 'same@example.com',
      preferredUsername: 'chef',
    });

    expect(user.username).toBe('chef');
  });
});
