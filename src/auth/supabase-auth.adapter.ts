import { HttpStatus, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseConfig } from 'src/config/supabase.config';
import type { AuthProvider, LoginRequestResult } from './auth-provider.interface';
import type { SessionInfo } from './dto/auth.dto';

@Injectable()
export class SupabaseAuthAdapter implements AuthProvider {
  private readonly logger = new Logger(SupabaseAuthAdapter.name);
  private readonly publishableClient: SupabaseClient;
  private readonly adminClient?: SupabaseClient;

  constructor(private readonly config: SupabaseConfig) {
    if (!this.config.url || !this.config.publishableKey) {
      throw new Error(
        'Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY',
      );
    }

    this.publishableClient = createClient(this.config.url, this.config.publishableKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    if (this.config.secretKey) {
      this.adminClient = createClient(this.config.url, this.config.secretKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }

    this.logger.log('Supabase clients ready');
  }

  async ensureUserExists(email: string, name?: string): Promise<void> {
    if (!this.adminClient) {
      throw new UnauthorizedException({
        message: 'SUPABASE_SECRET_KEY is required for ensure-user/register operations',
        code: HttpStatus.FORBIDDEN,
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { data: existingUsers, error: listError } = await this.adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      throw new UnauthorizedException({
        message: listError.message,
        code: HttpStatus.BAD_GATEWAY,
      });
    }

    const alreadyExists = existingUsers.users.some(
      (user) => user.email?.toLowerCase() === normalizedEmail,
    );

    if (alreadyExists) {
      return;
    }

    const { error: createError } = await this.adminClient.auth.admin.createUser({
      email: normalizedEmail,
      email_confirm: true,
      user_metadata: name ? { name: name.trim() } : undefined,
    });

    if (createError) {
      throw new UnauthorizedException({
        message: createError.message,
        code: HttpStatus.BAD_GATEWAY,
      });
    }

    this.logger.log(`User created in Supabase for email=${normalizedEmail}`);
  }

  async sendMagicLink(email: string): Promise<LoginRequestResult> {
    const redirectTo = this.config.frontendUrl || process.env.FRONTEND_URL;
    const otpOptions = {
      shouldCreateUser: false,
      ...(redirectTo ? { emailRedirectTo: redirectTo } : {}),
    };

    const { error } = await this.publishableClient.auth.signInWithOtp({
      email,
      options: otpOptions,
    });

    if (error) {
      if (error.message?.toLowerCase().includes('signups not allowed') && this.adminClient) {
        this.logger.log(`Lazy-provisioning Supabase account for email=${email}`);
        await this.ensureUserExists(email);

        const { error: retryError } = await this.publishableClient.auth.signInWithOtp({
          email,
          options: otpOptions,
        });

        if (retryError) {
          throw new UnauthorizedException({
            message: retryError.message,
            code: HttpStatus.BAD_GATEWAY,
          });
        }

        return { requestId: `supabase-${Date.now()}` };
      }

      throw new UnauthorizedException({
        message: error.message,
        code: HttpStatus.BAD_GATEWAY,
      });
    }

    return {
      requestId: `supabase-${Date.now()}`,
    };
  }

  async authenticateMagicLink(token: string): Promise<SessionInfo> {
    const normalizedToken = token.trim();

    const { data, error } = await this.publishableClient.auth.verifyOtp({
      token_hash: normalizedToken,
      type: 'email',
    });

    if (error || !data.session || !data.user) {
      throw new UnauthorizedException({
        message: error?.message || 'Invalid or expired magic link token',
        code: HttpStatus.UNAUTHORIZED,
      });
    }

    const expiresAt = data.session.expires_at
      ? new Date(data.session.expires_at * 1000)
      : this.getExpiryFromJwt(data.session.access_token);

    return {
      sessionToken: data.session.access_token,
      refreshToken: data.session.refresh_token ?? undefined,
      userId: data.user.id,
      email: data.user.email ?? undefined,
      name: this.extractName(data.user),
      expiresAt,
    };
  }

  async validateSession(sessionToken: string): Promise<SessionInfo> {
    const { data, error } = await this.publishableClient.auth.getUser(sessionToken);

    if (error || !data.user) {
      throw new UnauthorizedException({
        message: error?.message || 'Invalid session token',
        code: HttpStatus.UNAUTHORIZED,
      });
    }

    return {
      sessionToken,
      userId: data.user.id,
      email: data.user.email ?? undefined,
      name: this.extractName(data.user),
      expiresAt: this.getExpiryFromJwt(sessionToken),
    };
  }

  async refreshSession(refreshToken: string): Promise<SessionInfo> {
    const normalizedRefreshToken = refreshToken.trim();

    const { data, error } = await this.publishableClient.auth.refreshSession({
      refresh_token: normalizedRefreshToken,
    });

    if (error || !data.session) {
      throw new UnauthorizedException({
        message: error?.message || 'Invalid refresh token',
        code: HttpStatus.UNAUTHORIZED,
      });
    }

    const accessToken = data.session.access_token;
    const resolvedUser =
      data.user ?? (await this.publishableClient.auth.getUser(accessToken)).data.user;

    if (!resolvedUser) {
      throw new UnauthorizedException({
        message: 'Unable to resolve user from refreshed session',
        code: HttpStatus.UNAUTHORIZED,
      });
    }

    const expiresAt = data.session.expires_at
      ? new Date(data.session.expires_at * 1000)
      : this.getExpiryFromJwt(accessToken);

    return {
      sessionToken: accessToken,
      refreshToken: data.session.refresh_token ?? normalizedRefreshToken,
      userId: resolvedUser.id,
      email: resolvedUser.email ?? undefined,
      name: this.extractName(resolvedUser),
      expiresAt,
    };
  }

  async revokeSession(sessionToken: string): Promise<void> {
    if (!this.adminClient) {
      throw new UnauthorizedException({
        message: 'SUPABASE_SECRET_KEY is required for logout token revocation',
        code: HttpStatus.FORBIDDEN,
      });
    }

    const { error } = await this.adminClient.auth.admin.signOut(sessionToken, 'global');
    if (error) {
      throw new UnauthorizedException({
        message: error.message,
        code: HttpStatus.BAD_GATEWAY,
      });
    }
  }

  private getExpiryFromJwt(token: string): Date {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return new Date(Date.now() + 60 * 60 * 1000);
    }

    try {
      const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
      const payload = JSON.parse(payloadJson) as { exp?: number };
      if (payload.exp) {
        return new Date(payload.exp * 1000);
      }
    } catch {
      this.logger.warn('Could not parse token exp; falling back to 1h expiry');
    }

    return new Date(Date.now() + 60 * 60 * 1000);
  }

  private extractName(user: {
    user_metadata?: Record<string, unknown>;
    email?: string | null;
  }): string | undefined {
    const metadata = user.user_metadata ?? {};
    const rawName = metadata.name ?? metadata.full_name;
    if (typeof rawName === 'string' && rawName.trim().length > 0) {
      return rawName.trim();
    }
    return undefined;
  }
}
