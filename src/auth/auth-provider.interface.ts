import type { SessionInfo } from './dto/auth.dto';

export const AUTH_PROVIDER = 'AUTH_PROVIDER';
export type SocialProvider = 'google';

export interface LoginRequestResult {
  requestId: string;
}

export interface AuthProvider {
  ensureUserExists(email: string, name?: string): Promise<void>;
  sendMagicLink(email: string, locale?: string): Promise<LoginRequestResult>;
  getOAuthAuthorizationUrl(provider: SocialProvider): Promise<string>;
  authenticateMagicLink(token: string): Promise<SessionInfo>;
  validateSession(sessionToken: string): Promise<SessionInfo>;
  refreshSession(refreshToken: string): Promise<SessionInfo>;
  revokeSession(sessionToken: string): Promise<void>;
}
