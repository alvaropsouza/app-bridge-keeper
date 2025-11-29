import { Injectable, Inject, Logger } from '@nestjs/common';
import * as stytch from 'stytch';
import { STYTCH_CONFIG, StytchConfig } from '../config/stytch.config';

@Injectable()
export class StytchService {
  private readonly logger = new Logger(StytchService.name);
  private client: stytch.B2BClient;

  constructor(@Inject(STYTCH_CONFIG) private config: StytchConfig) {
    if (!config.projectId || !config.secret) {
      this.logger.warn('Stytch credentials not configured. Using mock mode.');
      // For testing purposes, we can work without actual credentials
    } else {
      this.client = new stytch.B2BClient({
        project_id: config.projectId,
        secret: config.secret,
      });
      this.logger.log('Stytch client initialized successfully');
    }
  }

  getClient(): stytch.B2BClient | null {
    return this.client || null;
  }

  /**
   * Send a magic link to the user's email
   */
  async sendMagicLink(email: string, organizationId: string) {
    if (!this.client) {
      throw new Error('Stytch client not initialized');
    }

    try {
      const response = await this.client.magicLinks.email.loginOrSignup({
        email_address: email,
        organization_id: organizationId,
      });
      this.logger.log(`Magic link sent to ${email}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to send magic link: ${error.message}`);
      throw error;
    }
  }

  /**
   * Authenticate a magic link token
   */
  async authenticateMagicLink(token: string) {
    if (!this.client) {
      throw new Error('Stytch client not initialized');
    }

    try {
      const response = await this.client.magicLinks.authenticate({
        magic_links_token: token,
      });
      this.logger.log('Magic link authenticated successfully');
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

  /**
   * Get member information
   */
  async getMember(organizationId: string, memberId: string) {
    if (!this.client) {
      throw new Error('Stytch client not initialized');
    }

    try {
      const response = await this.client.organizations.members.get({
        organization_id: organizationId,
        member_id: memberId,
      });
      this.logger.log(`Retrieved member ${memberId}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to get member: ${error.message}`);
      throw error;
    }
  }
}
