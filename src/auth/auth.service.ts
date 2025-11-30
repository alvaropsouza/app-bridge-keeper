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

  async authenticateMagicLink(token: string): Promise<SessionInfo> {
    try {
      const result = await this.stytchService.authenticateMagicLink(token);
      const expiresAt = new Date(Date.now() + 43200 * 60 * 1000);
      const email = result.user?.emails?.[0]?.email;

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

  async validateSession(sessionToken: string): Promise<SessionInfo> {
    try {
      const stytchResponse = await this.stytchService.authenticateSession(sessionToken);
      const user = stytchResponse.user;
      const session = stytchResponse.session;

      return {
        sessionToken: sessionToken,
        userId: user.user_id,
        expiresAt: session.expires_at ? new Date(session.expires_at) : new Date(),
      };
    } catch (error) {
      this.logger.error(`Session validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired session');
    }
  }

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
