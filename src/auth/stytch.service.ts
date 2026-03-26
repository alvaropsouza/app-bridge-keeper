import { Injectable, Inject, Logger, UnauthorizedException, HttpStatus } from '@nestjs/common';
import * as stytch from 'stytch';
import { STYTCH_CONFIG } from '../config/stytch.config';
import type { StytchConfig } from '../config/stytch.config';

@Injectable()
export class StytchService {
  private readonly logger = new Logger(StytchService.name);
  private client: stytch.Client;

  constructor(@Inject(STYTCH_CONFIG) private config: StytchConfig) {
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

  getClient(): stytch.Client | null {
    return this.client || null;
  }

  async findUserByEmail(email: string) {
    if (!this.client) {
      throw new Error('Stytch client not initialized');
    }

    const users = await this.client.users.search(this.buildUserSearchQuery(email));
    return users.results[0] ?? null;
  }

  async ensureUserExists(email: string, name?: string): Promise<void> {
    if (!this.client) {
      throw new Error('Stytch client not initialized');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await this.findUserByEmail(normalizedEmail);
    if (existingUser) {
      return;
    }

    const firstName = name?.trim().split(' ')[0];
    await this.client.users.create({
      email: normalizedEmail,
      ...(firstName ? { name: { first_name: firstName } } : {}),
    });

    this.logger.log(`User created in Stytch for email=${normalizedEmail}`);
  }

  async sendMagicLink(email: string, locale?: string) {
    if (!this.client) {
      throw new Error('Stytch client not initialized');
    }

    try {
      const redirectUrl = process.env.FRONTEND_URL;
      const login_magic_link_url = redirectUrl;
      const response = await this.client.magicLinks.email.send({
        login_expiration_minutes: 5,
        ...(locale ? { locale } : {}),
        email,
        login_magic_link_url,
      });

      this.logger.log(
        `Magic link requested for ${email} redirect=${login_magic_link_url} locale=${locale ?? 'default'}`,
      );

      return response;
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

  async authenticateMagicLink(token: string) {
    if (!this.client) {
      throw new Error('Stytch client not initialized');
    }

    try {
      const response = await this.client.magicLinks.authenticate({
        token,
        session_duration_minutes: 43200,
      });
      this.logger.log(`Magic link authenticated (30-day session) for userId=${response.user_id}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to authenticate magic link: ${error.message}`);
      throw error;
    }
  }

  async authenticateSession(sessionToken: string) {
    if (!this.client) {
      throw new Error('Stytch client not initialized');
    }

    try {
      const response = await this.client.sessions.authenticate({
        session_token: sessionToken,
      });
      this.logger.log(`Session authenticated successfully for userId=${response.user.user_id}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to authenticate session: ${error.message}`);
      throw error;
    }
  }

  async revokeSession(sessionToken: string) {
    if (!this.client) {
      throw new Error('Stytch client not initialized');
    }

    try {
      const response = await this.client.sessions.revoke({
        session_token: sessionToken,
      });
      this.logger.log('Session revoked successfully');
      return response;
    } catch (error) {
      this.logger.error(`Failed to revoke session: ${error.message}`);
      throw error;
    }
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
}
