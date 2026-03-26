import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { StytchService } from './stytch.service';
import { EnsureUserDto, LoginDto, RegisterDto, SessionInfo } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly stytchService: StytchService) {}

  async register(registerDto: RegisterDto) {
    this.logger.log(`Register requested for email=${registerDto.email.toLowerCase().trim()}`);
    try {
      await this.stytchService.ensureUserExists(registerDto.email, registerDto.name);
      this.logger.log(`Register completed for email=${registerDto.email.toLowerCase().trim()}`);
      return {
        success: true,
        message: 'User registered in Stytch successfully',
      };
    } catch (error) {
      this.logger.error(`Stytch registration failed: ${error.message}`);
      throw new UnauthorizedException('Unable to register user in Stytch');
    }
  }

  async ensureUser(ensureUserDto: EnsureUserDto) {
    this.logger.log(`Ensure user requested for email=${ensureUserDto.email.toLowerCase().trim()}`);
    try {
      await this.stytchService.ensureUserExists(ensureUserDto.email, ensureUserDto.name);
      this.logger.log(
        `Ensure user completed for email=${ensureUserDto.email.toLowerCase().trim()}`,
      );
      return {
        success: true,
        message: 'User ensured in Stytch successfully',
      };
    } catch (error) {
      this.logger.error(`Stytch ensure-user failed: ${error.message}`);
      throw new UnauthorizedException('Unable to ensure user in Stytch');
    }
  }

  async initiateLogin(loginDto: LoginDto) {
    const email = loginDto.email.toLowerCase().trim();
    this.logger.log(`Login initiation requested for email=${email}`);

    try {
      const result = await this.stytchService.sendMagicLink(email, loginDto.locale);
      this.logger.log(
        `Login initiation completed for email=${email} requestId=${result.request_id}`,
      );

      return {
        success: true,
        message: 'Magic link sent successfully',
        requestId: result.request_id,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(`Login initiation failed: ${error.message}`);
      throw new UnauthorizedException('Unable to initiate login');
    }
  }

  async authenticateMagicLink(token: string): Promise<SessionInfo> {
    this.logger.log('Magic link authentication requested');
    try {
      const result = await this.stytchService.authenticateMagicLink(token);
      // 43200 minutes = 30 days. Convert to milliseconds correctly
      const expiresAt = new Date(Date.now() + 43200 * 60 * 1000);
      const email = result.user?.emails?.[0]?.email;

      // Use the session expiry from Stytch if available
      const sessionExpiresAt = result.session?.expires_at
        ? new Date(result.session.expires_at)
        : expiresAt;

      const sessionInfo = {
        sessionToken: result.session_token,
        userId: result.user_id,
        email,
        name: result.user?.name?.first_name,
        expiresAt: sessionExpiresAt,
      };

      this.logger.log(`Magic link authentication completed for userId=${sessionInfo.userId}`);

      return sessionInfo;
    } catch (error) {
      this.logger.error(`Magic link authentication failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired magic link');
    }
  }

  async validateSession(sessionToken: string): Promise<SessionInfo> {
    this.logger.log('Session validation requested');
    try {
      const stytchResponse = await this.stytchService.authenticateSession(sessionToken);
      const user = stytchResponse.user;
      const session = stytchResponse.session;
      const email = user?.emails?.[0]?.email;

      const sessionInfo = {
        sessionToken: sessionToken,
        userId: user.user_id,
        email,
        name: user?.name?.first_name,
        expiresAt: session.expires_at ? new Date(session.expires_at) : new Date(),
      };

      this.logger.log(`Session validation completed for userId=${sessionInfo.userId}`);

      return sessionInfo;
    } catch (error) {
      this.logger.error(`Session validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired session');
    }
  }

  async logout(sessionToken: string) {
    this.logger.log('Logout requested');
    try {
      await this.stytchService.revokeSession(sessionToken);
      this.logger.log('Logout completed');

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
