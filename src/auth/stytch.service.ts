import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadGatewayException,
  HttpException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as stytch from 'stytch';
import { STYTCH_CONFIG } from '../config/stytch.config';
import type { StytchConfig } from '../config/stytch.config';
import { MagicLinkLocale, isMagicLinkLocale } from './locale.enum';

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

  async sendMagicLink(email: string, locale?: MagicLinkLocale) {
    if (!this.client) {
      throw new ServiceUnavailableException('Stytch client not initialized');
    }

    if (!this.config.frontendUrl) {
      throw new InternalServerErrorException('FRONTEND_URL not configured');
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
      const user = await this.client.users.search(getUserByEmailQuery);

      const noUsersFound = user.results.length === 0;
      if (noUsersFound) {
        throw new NotFoundException({ message: `User with email ${email} not found` });
      }

      const login_magic_link_url = this.config.frontendUrl;
      const resolvedLocale = this.resolveLocale(locale);
      const response = await this.client.magicLinks.email.loginOrCreate({
        signup_expiration_minutes: 5,
        locale: resolvedLocale,
        email,
        login_magic_link_url,
      });

      this.logger.log(
        `Magic link requested for ${email} redirect=${login_magic_link_url} locale=${resolvedLocale}`,
      );

      return response;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new BadGatewayException(this.getProviderMessage(error, 'Failed to send magic link'));
    }
  }

  async authenticateMagicLink(token: string) {
    if (!this.client) {
      throw new ServiceUnavailableException('Stytch client not initialized');
    }

    try {
      const response = await this.client.magicLinks.authenticate({
        token,
        session_duration_minutes: 43200,
      });
      this.logger.log(`Magic link authenticated for user ${response.user_id}`);
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to authenticate magic link: ${this.getProviderMessage(error, 'Unknown error')}`,
      );
      throw new BadGatewayException(
        this.getProviderMessage(error, 'Failed to authenticate magic link'),
      );
    }
  }

  async authenticateSession(sessionToken: string) {
    if (!this.client) {
      throw new ServiceUnavailableException('Stytch client not initialized');
    }

    try {
      const response = await this.client.sessions.authenticate({
        session_token: sessionToken,
      });
      this.logger.log(`Session authenticated for user ${response.user.user_id}`);
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to authenticate session: ${this.getProviderMessage(error, 'Unknown error')}`,
      );
      throw new BadGatewayException(
        this.getProviderMessage(error, 'Failed to authenticate session'),
      );
    }
  }

  async revokeSession(sessionToken: string) {
    if (!this.client) {
      throw new ServiceUnavailableException('Stytch client not initialized');
    }

    try {
      const response = await this.client.sessions.revoke({
        session_token: sessionToken,
      });
      this.logger.log('Session revoked successfully');
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to revoke session: ${this.getProviderMessage(error, 'Unknown error')}`,
      );
      throw new BadGatewayException(this.getProviderMessage(error, 'Failed to revoke session'));
    }
  }

  private resolveLocale(locale?: string | null): MagicLinkLocale {
    if (!locale) {
      return MagicLinkLocale.EN;
    }

    const normalized = locale.toLowerCase().replace('_', '-') as MagicLinkLocale;
    if (isMagicLinkLocale(normalized)) {
      return normalized;
    }

    return MagicLinkLocale.EN;
  }

  private getProviderMessage(error: unknown, fallback: string): string {
    if (error instanceof Error) {
      return error.message;
    }

    const responseMessage = (error as { response?: { message?: string } })?.response?.message;
    if (responseMessage) {
      return responseMessage;
    }

    return fallback;
  }
}
