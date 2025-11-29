import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { StytchService } from './stytch.service';

export class LoginDto {
  @ApiProperty({
    description: 'Email address of the user',
    example: 'user@example.com',
  })
  email: string;
}

export class AuthenticateDto {
  @ApiProperty({
    description: 'Authentication token (magic link token or session token)',
    example: 'token_123abc...',
  })
  token: string;

  @ApiProperty({
    description: 'Type of authentication',
    enum: ['magic_link', 'session'],
    example: 'magic_link',
  })
  type: 'magic_link' | 'session';
}

export interface SessionInfo {
  sessionToken: string;
  userId: string;
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
      const result = await this.stytchService.sendMagicLink(loginDto.email);

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
        userId: result.user_id,
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
        sessionToken: result.session.session_id,
        userId: result.session.user_id,
        expiresAt: new Date(result.session.expires_at),
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
   * Get user information
   */
  async getUserInfo(userId: string) {
    try {
      const result = await this.stytchService.getUser(userId);

      return {
        userId: result.user_id,
        email: result.emails && result.emails.length > 0 ? result.emails[0].email : null,
        status: result.status,
        name: result.name,
      };
    } catch (error) {
      this.logger.error(`Failed to get user info: ${error.message}`);
      throw new UnauthorizedException('Failed to retrieve user information');
    }
  }
}
