import { Injectable, Inject, Logger } from '@nestjs/common';
import * as stytch from 'stytch';
import { STYTCH_CONFIG, StytchConfig } from '../config/stytch.config';

@Injectable()
export class StytchService {
  private readonly logger = new Logger(StytchService.name);
  private client: stytch.Client;

  constructor(@Inject(STYTCH_CONFIG) private config: StytchConfig) {
    if (!config.projectId || !config.secret) {
      this.logger.warn('Stytch credentials not configured. Using mock mode.');
      // For testing purposes, we can work without actual credentials
    } else {
      this.client = new stytch.Client({
        project_id: config.projectId,
        secret: config.secret,
      });
      this.logger.log('Stytch client initialized successfully');
    }
  }

  getClient(): stytch.Client | null {
    return this.client || null;
  }

  /**
   * Send a magic link to the user's email
   */
  async sendMagicLink(email: string) {
    if (!this.client) {
      throw new Error('Stytch client not initialized');
    }

    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      // IMPORTANT: Do NOT append a custom token placeholder or query params here.
      // Stytch validates the *exact* redirect URL (including query param names) against those
      // configured in the dashboard. Supplying a placeholder like ?token={{token}} causes
      // a `query_params_do_not_match` error because that exact pattern isn't registered.
      // The Stytch-generated magic link will include its own parameters when the user clicks.
      const login_magic_link_url = frontendUrl; // must exactly match one of the dashboard Redirect URLs.
      const response = await this.client.magicLinks.email.loginOrCreate({
        email,
        login_magic_link_url,
      });
      this.logger.log(`Magic link requested for ${email}. Redirect base: ${login_magic_link_url}`);
      return response;
    } catch (error) {
      // Expanded logging to help diagnose redirect mismatches without lint warnings.
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

  /**
   * Authenticate a magic link token
   * Sets a 30-day session duration per Stytch best practices
   */
  async authenticateMagicLink(token: string) {
    if (!this.client) {
      throw new Error('Stytch client not initialized');
    }

    try {
      const response = await this.client.magicLinks.authenticate({
        token: token,
        session_duration_minutes: 43200, // 30 days = 30 * 24 * 60 = 43200 minutes
      });
      this.logger.log('Magic link authenticated successfully with 30-day session');
      this.logger.debug('Magic link response:', JSON.stringify(response, null, 2));
      return response;
    } catch (error) {
      this.logger.error(`Failed to authenticate magic link: ${error.message}`);
      throw error;
    }
  }

  /**
   * Authenticate a session token
   */
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

  /**
   * Revoke a session
   */
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
