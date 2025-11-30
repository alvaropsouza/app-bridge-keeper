import { Injectable, Inject, Logger, UnauthorizedException } from '@nestjs/common';
import * as stytch from 'stytch';
import { STYTCH_CONFIG } from '../config/stytch.config';
import type { StytchConfig } from '../config/stytch.config';

@Injectable()
export class StytchService {
  private readonly logger = new Logger(StytchService.name);
  private client: stytch.Client;

  constructor(@Inject(STYTCH_CONFIG) private config: StytchConfig) {
    if (!config.projectId || !config.secret) {
      this.logger.warn('Missing Stytch credentials; running without client');
      return;
    }
    this.client = new stytch.Client({ project_id: config.projectId, secret: config.secret });
    this.logger.log('Stytch client ready');
  }

  getClient(): stytch.Client | null {
    return this.client || null;
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'object' && error && 'message' in error) {
      const { message } = error as { message: unknown };
      return typeof message === 'string' ? message : JSON.stringify(message);
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'Unknown error';
  }

  async sendMagicLink(email: string) {
    if (!this.client) {
      throw new Error('Stytch client not initialized');
    }

    const getUserByEmailQuery: stytch.UsersSearchRequest = {
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

    try {
      const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      const user = await this.client.users.search(getUserByEmailQuery);

      const noUsersFound = user.results.length === 0;
      if (noUsersFound) {
        throw new UnauthorizedException({ message: 'User not found' });
      }

      const login_magic_link_url = redirectUrl;
      const response = await this.client.magicLinks.email.loginOrCreate({
        email,
        login_magic_link_url,
      });
      this.logger.log(`Magic link requested for ${email} redirect=${login_magic_link_url}`);
      return response;
    } catch (error) {
      const errMessage = this.extractErrorMessage(error);

      this.logger.error(`Failed to send magic link: ${errMessage}`);

      this.logErrorDetails(error);

      throw error;
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
      this.logger.log('Magic link authenticated (30-day session)');
      this.logger.debug('Magic link response:', JSON.stringify(response, null, 2));
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
      this.logger.log('Session authenticated successfully');
      this.logger.debug('Session response:', JSON.stringify(response, null, 2));
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

  private logErrorDetails(error: unknown): void {
    try {
      this.logger.error(`Full error JSON: ${JSON.stringify(error)}`);
    } catch {
      this.logger.debug(`Could not stringify error object: ${String(error)}`);
    }
  }
}
