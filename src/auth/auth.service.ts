import { Injectable, UnauthorizedException, Logger, HttpException } from '@nestjs/common';
import { StytchService } from './stytch.service';
import { LoginDto, SessionInfo } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly stytchService: StytchService) {}

  async initiateLogin(loginDto: LoginDto) {
    try {
      const result = await this.stytchService.sendMagicLink(loginDto.email, loginDto.locale);

      return {
        success: true,
        message: 'Magic link sent successfully',
        requestId: result.request_id,
      };
    } catch (error) {
      const message = this.getErrorMessage(error);
      this.logger.error(`Login initiation failed: ${message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new UnauthorizedException('Unable to initiate login');
    }
  }

  async authenticateMagicLink(token: string): Promise<SessionInfo> {
    try {
      const result = await this.stytchService.authenticateMagicLink(token);
      // 43200 minutes = 30 days. Convert to milliseconds correctly
      const expiresAt = new Date(Date.now() + 43200 * 60 * 1000);
      const email = result.user?.emails?.[0]?.email;

      // Use the session expiry from Stytch if available
      const sessionExpiresAt = result.session?.expires_at
        ? new Date(result.session.expires_at)
        : expiresAt;

      return {
        sessionToken: result.session_token,
        userId: result.user_id,
        email,
        name: result.user?.name?.first_name,
        expiresAt: sessionExpiresAt,
      };
    } catch (error) {
      const message = this.getErrorMessage(error);
      this.logger.error(`Magic link authentication failed: ${message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired magic link');
    }
  }

  async validateSession(sessionToken: string): Promise<SessionInfo> {
    try {
      const stytchResponse = await this.stytchService.authenticateSession(sessionToken);
      const user = stytchResponse.user;
      const session = stytchResponse.session;
      const email = user?.emails?.[0]?.email;

      return {
        sessionToken: sessionToken,
        userId: user.user_id,
        email,
        name: user?.name?.first_name,
        expiresAt: session.expires_at ? new Date(session.expires_at) : new Date(),
      };
    } catch (error) {
      const message = this.getErrorMessage(error);
      this.logger.error(`Session validation failed: ${message}`);
      if (error instanceof HttpException) {
        throw error;
      }
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
      const message = this.getErrorMessage(error);
      this.logger.error(`Logout failed: ${message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new UnauthorizedException('Failed to revoke session');
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
