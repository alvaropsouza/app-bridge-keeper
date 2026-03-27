import { HttpStatus, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as stytch from 'stytch';
import { STYTCH_CONFIG } from '../config/stytch.config';
import type { StytchConfig } from '../config/stytch.config';
import type { AuthProvider, LoginRequestResult } from './auth-provider.interface';
import type { SessionInfo } from './dto/auth.dto';

@Injectable()
export class StytchAuthProvider implements AuthProvider {
  private readonly logger = new Logger(StytchAuthProvider.name);
  private client: stytch.Client;

  constructor(@Inject(STYTCH_CONFIG) private readonly config: StytchConfig) {
    if (!this.config.projectId || !this.config.secret) {
      this.logger.error('Missing Stytch credentials; running without client');
      return;
    }

    this.client = new stytch.Client({
      project_id: this.config.projectId,
      secret: this.config.secret,
    });

    this.logger.log('Stytch client ready');
  }

  async ensureUserExists(email: string, name?: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await this.findUserByEmail(normalizedEmail);

    if (existingUser) {
      return;
    }

    const firstName = name?.trim().split(' ')[0];
    await this.getClientOrThrow().users.create({
      email: normalizedEmail,
      ...(firstName ? { name: { first_name: firstName } } : {}),
    });

    this.logger.log(`User created in Stytch for email=${normalizedEmail}`);
  }

  async sendMagicLink(email: string, locale?: string): Promise<LoginRequestResult> {
    try {
      const redirectUrl = process.env.FRONTEND_URL;
      const response = await this.getClientOrThrow().magicLinks.email.send({
        login_expiration_minutes: 5,
        ...(locale ? { locale } : {}),
        email,
        login_magic_link_url: redirectUrl,
      });

      this.logger.log(
        `Magic link requested for ${email} redirect=${redirectUrl} locale=${locale ?? 'default'}`,
      );

      return {
        requestId: response.request_id,
      };
    } catch (error) {
      if (error?.error_type === 'email_not_found') {
        throw new UnauthorizedException({
          message: 'Email nao cadastrado. Crie sua conta antes de entrar.',
          code: HttpStatus.NOT_FOUND,
        });
      }

      throw new UnauthorizedException({
        message: error?.error_message ?? 'Falha ao enviar o link magico. Tente novamente.',
        code: error?.status_code ?? HttpStatus.UNAUTHORIZED,
      });
    }
  }

  async authenticateMagicLink(token: string): Promise<SessionInfo> {
    try {
      const response = await this.getClientOrThrow().magicLinks.authenticate({
        token,
        session_duration_minutes: 43200,
      });

      this.logger.log(`Magic link authenticated (30-day session) for userId=${response.user_id}`);
      return this.toSessionInfo({
        sessionToken: response.session_token,
        userId: response.user_id,
        email: response.user?.emails?.[0]?.email,
        name: response.user?.name?.first_name,
        expiresAt: response.session?.expires_at
          ? new Date(response.session.expires_at)
          : new Date(Date.now() + 43200 * 60 * 1000),
      });
    } catch (error) {
      this.logger.error(`Failed to authenticate magic link: ${error.message}`);
      throw error;
    }
  }

  async validateSession(sessionToken: string): Promise<SessionInfo> {
    try {
      const response = await this.getClientOrThrow().sessions.authenticate({
        session_token: sessionToken,
      });

      this.logger.log(`Session authenticated successfully for userId=${response.user.user_id}`);
      return this.toSessionInfo({
        sessionToken,
        userId: response.user.user_id,
        email: response.user?.emails?.[0]?.email,
        name: response.user?.name?.first_name,
        expiresAt: response.session.expires_at ? new Date(response.session.expires_at) : new Date(),
      });
    } catch (error) {
      this.logger.error(`Failed to authenticate session: ${error.message}`);
      throw error;
    }
  }

  async revokeSession(sessionToken: string): Promise<void> {
    try {
      await this.getClientOrThrow().sessions.revoke({
        session_token: sessionToken,
      });

      this.logger.log('Session revoked successfully');
    } catch (error) {
      this.logger.error(`Failed to revoke session: ${error.message}`);
      throw error;
    }
  }

  private async findUserByEmail(email: string) {
    const users = await this.getClientOrThrow().users.search(this.buildUserSearchQuery(email));
    return users.results[0] ?? null;
  }

  private getClientOrThrow(): stytch.Client {
    if (!this.client) {
      throw new Error('Stytch client not initialized');
    }

    return this.client;
  }

  private buildUserSearchQuery(email: string): stytch.UsersSearchRequest {
    return {
      query: {
        operator: 'AND',
        operands: [
          {
            filter_name: 'email_address',
            filter_value: [email],
          },
        ],
      },
    };
  }

  private toSessionInfo(sessionInfo: SessionInfo): SessionInfo {
    return sessionInfo;
  }
}
