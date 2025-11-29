import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { StytchService } from './stytch.service';

export interface LoginDto {
  email: string;
  organizationId: string;
}

export interface AuthenticateDto {
  token: string;
  type: 'magic_link' | 'session';
}

export interface SessionInfo {
  sessionToken: string;
  memberId: string;
  organizationId: string;
  expiresAt: Date;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly stytchService: StytchService) {}

  /**
   * Initiate login by sending magic link
   */
  async initiateLogin(loginDto: LoginDto) {
    try {
      const result = await this.stytchService.sendMagicLink(
        loginDto.email,
        loginDto.organizationId,
      );

      return {
        success: true,
        message: 'Magic link sent successfully',
        requestId: result.request_id,
      };
    } catch (error) {
      this.logger.error(`Login initiation failed: ${error.message}`);
      throw new UnauthorizedException('Failed to send magic link');
    }
  }

  /**
   * Authenticate using magic link token
   */
  async authenticateMagicLink(token: string): Promise<SessionInfo> {
    try {
      const result = await this.stytchService.authenticateMagicLink(token);

      // Magic link response doesn't include session expiry directly
      // Set a default expiry of 24 hours from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      return {
        sessionToken: result.session_token,
        memberId: result.member_id,
        organizationId: result.organization_id,
        expiresAt,
      };
    } catch (error) {
      this.logger.error(`Magic link authentication failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired magic link');
    }
  }

  /**
   * Validate an existing session
   */
  async validateSession(sessionToken: string): Promise<SessionInfo> {
    try {
      const result = await this.stytchService.authenticateSession(sessionToken);

      return {
        sessionToken: result.session_token,
        memberId: result.member.member_id,
        organizationId: result.organization.organization_id,
        expiresAt: new Date(result.member_session.expires_at),
      };
    } catch (error) {
      this.logger.error(`Session validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired session');
    }
  }

  /**
   * Logout by revoking session
   */
  async logout(sessionToken: string) {
    try {
      await this.stytchService.revokeSession(sessionToken);

      return {
        success: true,
        message: 'Session revoked successfully',
      };
    } catch (error) {
      this.logger.error(`Logout failed: ${error.message}`);
      throw new UnauthorizedException('Failed to revoke session');
    }
  }

  /**
   * Get member information
   */
  async getMemberInfo(organizationId: string, memberId: string) {
    try {
      const result = await this.stytchService.getMember(organizationId, memberId);

      return {
        memberId: result.member.member_id,
        email: result.member.email_address,
        status: result.member.status,
        name: result.member.name,
        organizationId: result.member.organization_id,
      };
    } catch (error) {
      this.logger.error(`Failed to get member info: ${error.message}`);
      throw new UnauthorizedException('Failed to retrieve member information');
    }
  }
}
