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
    description:
      'Type of authentication (optional if auto-detect). Accepted values: magic_link, session',
    enum: ['magic_link', 'session'],
    example: 'magic_link',
    required: false,
  })
  type?: 'magic_link' | 'session';
}

export interface SessionInfo {
  sessionToken: string;
  userId: string;
  email?: string;
  name?: string;
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
   * Per Stytch best practices: uses server-calculated session expiry
   */
  async authenticateMagicLink(token: string): Promise<SessionInfo> {
    try {
      const result = await this.stytchService.authenticateMagicLink(token);

      // Calculate session expiry based on the session duration we set
      // We set 30 days (43200 minutes) in the authenticate call
      const expiresAt = new Date(Date.now() + 43200 * 60 * 1000); // 30 days

      // Extract email from the user object if available
      const email =
        result.user?.emails && result.user.emails.length > 0
          ? result.user.emails[0].email
          : undefined;

      return {
        sessionToken: result.session_token,
        userId: result.user_id,
        email,
        name: result.user?.name?.first_name,
        expiresAt,
      };
    } catch (error) {
      this.logger.error(`Magic link authentication failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired magic link');
    }
  }

  /**
   * Validate an existing session
   * Per Stytch best practices, validates session with Stytch on every protected request
   */
  async validateSession(sessionToken: string): Promise<SessionInfo> {
    try {
      // Validate session with Stytch (per best practices - validate on every protected request)
      const stytchResponse = await this.stytchService.authenticateSession(sessionToken);

      // Extract user and session info from Stytch response
      const user = stytchResponse.user;
      const session = stytchResponse.session;

      return {
        sessionToken: sessionToken,
        userId: user.user_id,
        expiresAt: new Date(session.expires_at),
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
}
