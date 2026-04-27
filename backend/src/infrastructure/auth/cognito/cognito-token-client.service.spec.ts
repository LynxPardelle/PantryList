import { ConfigService } from '@nestjs/config';
import { CognitoTokenClientService } from './cognito-token-client.service';

describe('CognitoTokenClientService', () => {
  const originalFetch = global.fetch;

  const makeConfigService = () =>
    ({
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          COGNITO_DOMAIN: 'https://pantrylist.auth.us-east-1.amazoncognito.com',
          COGNITO_CLIENT_ID: 'client-123',
          COGNITO_CLIENT_SECRET: 'secret-456',
        };

        return values[key];
      }),
    }) as unknown as ConfigService;

  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'access-token',
            id_token: 'id-token',
            refresh_token: 'refresh-token',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
      } as Response),
    );
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('exchanges authorization codes with PKCE verifier at Cognito token endpoint', async () => {
    const service = new CognitoTokenClientService(makeConfigService());

    const result = await service.exchangeCode({
      code: 'authorization-code',
      codeVerifier: 'pkce-verifier',
      redirectUri: 'http://localhost:48673/api/auth/cognito/callback',
    });
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ];
    const body = new URLSearchParams(init.body as string);

    expect(url).toBe(
      'https://pantrylist.auth.us-east-1.amazoncognito.com/oauth2/token',
    );
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from('client-123:secret-456').toString(
        'base64',
      )}`,
    });
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('client_id')).toBe('client-123');
    expect(body.get('code')).toBe('authorization-code');
    expect(body.get('redirect_uri')).toBe(
      'http://localhost:48673/api/auth/cognito/callback',
    );
    expect(body.get('code_verifier')).toBe('pkce-verifier');
    expect(result).toEqual({
      accessToken: 'access-token',
      idToken: 'id-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600,
      tokenType: 'Bearer',
    });
  });

  it('refreshes Cognito tokens with the refresh-token grant', async () => {
    const service = new CognitoTokenClientService(makeConfigService());

    await service.refresh({ refreshToken: 'refresh-token' });
    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ];
    const body = new URLSearchParams(init.body as string);

    expect(body.get('grant_type')).toBe('refresh_token');
    expect(body.get('refresh_token')).toBe('refresh-token');
    expect(body.get('client_id')).toBe('client-123');
  });
});
