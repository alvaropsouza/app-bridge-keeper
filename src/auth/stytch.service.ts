import { Injectable, Inject, Logger } from '@nestjs/common';
import * as stytch from 'stytch';
import { STYTCH_CONFIG, StytchConfig } from '../config/stytch.config';

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

  async sendMagicLink(email: string) {
    if (!this.client) {
      throw new Error('Stytch client not initialized');
    }

    try {
      const redirectUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      const login_magic_link_url = redirectUrl;
      const response = await this.client.magicLinks.email.loginOrCreate({
        email,
        login_magic_link_url,
      });
      this.logger.log(`Magic link requested for ${email} redirect=${login_magic_link_url}`);
      return response;
    } catch (error) {
      let errMessage = 'Unknown error';
      if (typeof error === 'object' && error && 'message' in error) {
        const { message } = error as { message: unknown };
        errMessage = typeof message === 'string' ? message : JSON.stringify(message);
      } else if (error) {
        errMessage = String(error);
      }
      this.logger.error(`Failed to send magic link: ${errMessage}`);
      try {
        this.logger.error(`Full error JSON: ${JSON.stringify(error)}`);
      } catch (error_) {
        this.logger.debug(`Could not stringify error object: ${String(error_)}`);
      }
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
}
