import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CognitoRefreshInput,
  CognitoTokenClient,
  CognitoTokenExchangeInput,
  CognitoTokenSet,
} from '../../../application/ports/cognito-auth.port';

interface CognitoTokenEndpointResponse {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

@Injectable()
export class CognitoTokenClientService implements CognitoTokenClient {
  constructor(private readonly configService: ConfigService) {}

  async exchangeCode(
    input: CognitoTokenExchangeInput,
  ): Promise<CognitoTokenSet> {
    return this.postTokenRequest({
      grant_type: 'authorization_code',
      client_id: this.getClientId(),
      code: input.code,
      redirect_uri: input.redirectUri,
      code_verifier: input.codeVerifier,
    });
  }

  async refresh(input: CognitoRefreshInput): Promise<CognitoTokenSet> {
    return this.postTokenRequest({
      grant_type: 'refresh_token',
      client_id: this.getClientId(),
      refresh_token: input.refreshToken,
    });
  }

  private async postTokenRequest(
    params: Record<string, string>,
  ): Promise<CognitoTokenSet> {
    const response = await fetch(this.getTokenEndpoint(), {
      method: 'POST',
      headers: this.getHeaders(),
      body: new URLSearchParams(params).toString(),
    });

    if (!response.ok) {
      throw new UnauthorizedException('Cognito token request failed');
    }

    const payload = (await response.json()) as CognitoTokenEndpointResponse;

    return {
      accessToken: payload.access_token,
      idToken: payload.id_token,
      refreshToken: payload.refresh_token,
      expiresIn: payload.expires_in,
      tokenType: payload.token_type,
    };
  }

  private getTokenEndpoint(): string {
    return new URL('/oauth2/token', this.getCognitoDomain()).toString();
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    const clientSecret = this.configService.get<string>(
      'COGNITO_CLIENT_SECRET',
    );

    if (clientSecret) {
      headers.Authorization = `Basic ${Buffer.from(
        `${this.getClientId()}:${clientSecret}`,
      ).toString('base64')}`;
    }

    return headers;
  }

  private getCognitoDomain(): string {
    return (
      this.configService.get<string>('COGNITO_DOMAIN') ??
      'https://example.auth.us-east-1.amazoncognito.com'
    );
  }

  private getClientId(): string {
    return this.configService.get<string>('COGNITO_CLIENT_ID') ?? '';
  }
}
