import { ConfigService } from '@nestjs/config';
import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthCookieService } from './auth-cookie.service';

describe('AuthCookieService', () => {
  const makeConfigService = () =>
    ({
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          AUTH_COOKIE_SECURE: 'false',
          AUTH_COOKIE_SAME_SITE: 'lax',
          COGNITO_AUTH_TRANSACTION_TTL_SECONDS: '300',
        };

        return values[key];
      }),
    }) as unknown as ConfigService;

  const makeReply = () =>
    ({
      setCookie: jest.fn(),
      clearCookie: jest.fn(),
    }) as unknown as jest.Mocked<FastifyReply>;

  it('sets Cognito token cookies and a readable XSRF cookie', () => {
    const service = new AuthCookieService(makeConfigService());
    const reply = makeReply();

    service.setSessionCookies(reply, {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      xsrfToken: 'xsrf-token',
    });

    expect(reply.setCookie).toHaveBeenCalledWith(
      'pantrylist_access_token',
      'access-token',
      expect.objectContaining({ httpOnly: true, path: '/' }),
    );
    expect(reply.setCookie).toHaveBeenCalledWith(
      'pantrylist_refresh_token',
      'refresh-token',
      expect.objectContaining({ httpOnly: true, path: '/api/auth' }),
    );
    expect(reply.setCookie).toHaveBeenCalledWith(
      'XSRF-TOKEN',
      'xsrf-token',
      expect.objectContaining({ httpOnly: false, path: '/' }),
    );
  });

  it('stores and reads short-lived Cognito auth transaction cookies', () => {
    const service = new AuthCookieService(makeConfigService());
    const reply = makeReply();

    service.setCognitoAuthTransactionCookies(reply, {
      state: 'state-value',
      nonce: 'nonce-value',
      codeVerifier: 'verifier-value',
      redirectTo: '/pantry',
    });
    const request = {
      cookies: {
        pantrylist_cognito_state: 'state-value',
        pantrylist_cognito_nonce: 'nonce-value',
        pantrylist_cognito_code_verifier: 'verifier-value',
        pantrylist_cognito_redirect_to: '/pantry',
      },
    } as unknown as FastifyRequest;

    expect(reply.setCookie).toHaveBeenCalledWith(
      'pantrylist_cognito_state',
      'state-value',
      expect.objectContaining({
        httpOnly: true,
        path: '/api/auth/cognito',
        maxAge: 300,
      }),
    );
    expect(service.getCognitoAuthTransactionFromRequest(request)).toEqual({
      state: 'state-value',
      nonce: 'nonce-value',
      codeVerifier: 'verifier-value',
      redirectTo: '/pantry',
    });
  });
});
