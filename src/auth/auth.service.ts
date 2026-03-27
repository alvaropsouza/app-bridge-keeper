import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AUTH_PROVIDER } from './auth-provider.interface';
import type { AuthProvider } from './auth-provider.interface';
import { EnsureUserDto, LoginDto, RegisterDto, SessionInfo } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(@Inject(AUTH_PROVIDER) private readonly authProvider: AuthProvider) {}

  async register(registerDto: RegisterDto) {
    this.logger.log(`Register requested for email=${registerDto.email.toLowerCase().trim()}`);
    try {
      await this.authProvider.ensureUserExists(registerDto.email, registerDto.name);
      this.logger.log(`Register completed for email=${registerDto.email.toLowerCase().trim()}`);
      return {
        success: true,
        message: 'User registered successfully',
      };
    } catch (error) {
      this.logger.error(`Auth provider registration failed: ${error.message}`);
      throw new UnauthorizedException('Unable to register user');
    }
  }

  async ensureUser(ensureUserDto: EnsureUserDto) {
    this.logger.log(`Ensure user requested for email=${ensureUserDto.email.toLowerCase().trim()}`);
    try {
      await this.authProvider.ensureUserExists(ensureUserDto.email, ensureUserDto.name);
      this.logger.log(
        `Ensure user completed for email=${ensureUserDto.email.toLowerCase().trim()}`,
      );
      return {
        success: true,
        message: 'User ensured successfully',
      };
    } catch (error) {
      this.logger.error(`Auth provider ensure-user failed: ${error.message}`);
      throw new UnauthorizedException('Unable to ensure user');
    }
  }

  async initiateLogin(loginDto: LoginDto) {
    const email = loginDto.email.toLowerCase().trim();
    this.logger.log(`Login initiation requested for email=${email}`);

    try {
      const result = await this.authProvider.sendMagicLink(email, loginDto.locale);
      this.logger.log(
        `Login initiation completed for email=${email} requestId=${result.requestId}`,
      );

      return {
        success: true,
        message: 'Magic link sent successfully',
        requestId: result.requestId,
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
      const sessionInfo = await this.authProvider.authenticateMagicLink(token);

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
      const sessionInfo = await this.authProvider.validateSession(sessionToken);

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
      await this.authProvider.revokeSession(sessionToken);
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
