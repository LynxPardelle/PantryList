export interface JwtSessionClaims {
  sub: string;
  sid: string;
  type: 'access' | 'refresh';
}

export interface JwtSessionService {
  signAccessToken(userId: string, sessionId: string): Promise<string>;
  signRefreshToken(userId: string, sessionId: string): Promise<string>;
  verifyAccessToken(token: string): Promise<JwtSessionClaims>;
  verifyRefreshToken(token: string): Promise<JwtSessionClaims>;
  createOpaqueToken(byteLength?: number): string;
}
