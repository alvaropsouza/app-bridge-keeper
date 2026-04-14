import { HttpException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { EnsureUserDto, LoginDto, RegisterDto, SessionInfo } from './dto/auth.dto';
import { AuthenticateMagicLinkUseCase } from './use-cases/authenticate-magic-link.use-case';
import { EnsureUserUseCase } from './use-cases/ensure-user.use-case';
import { GetOAuthAuthorizationUrlUseCase } from './use-cases/get-oauth-authorization-url.use-case';
import { InitiateLoginUseCase } from './use-cases/initiate-login.use-case';
import { LogoutUseCase } from './use-cases/logout.use-case';
import { RefreshSessionUseCase } from './use-cases/refresh-session.use-case';
import { RegisterUserUseCase } from './use-cases/register-user.use-case';
import { ValidateSessionUseCase } from './use-cases/validate-session.use-case';

@Injectable()
export class AuthService {
	private readonly logger = new Logger(AuthService.name);

	constructor(
		private readonly registerUserUseCase: RegisterUserUseCase,
		private readonly ensureUserUseCase: EnsureUserUseCase,
		private readonly initiateLoginUseCase: InitiateLoginUseCase,
		private readonly authenticateMagicLinkUseCase: AuthenticateMagicLinkUseCase,
		private readonly validateSessionUseCase: ValidateSessionUseCase,
		private readonly refreshSessionUseCase: RefreshSessionUseCase,
		private readonly logoutUseCase: LogoutUseCase,
		private readonly getOAuthAuthorizationUrlUseCase: GetOAuthAuthorizationUrlUseCase,
	) {}

	async register(registerDto: RegisterDto) {
		this.logger.log(`Register requested for email=${registerDto.email.toLowerCase().trim()}`);
		try {
			await this.registerUserUseCase.execute({
				email: registerDto.email,
				name: registerDto.name,
			});
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
			await this.ensureUserUseCase.execute({
				email: ensureUserDto.email,
				name: ensureUserDto.name,
			});
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
			const result = await this.initiateLoginUseCase.execute({
				email,
				locale: loginDto.locale,
			});
			this.logger.log(
				`Login initiation completed for email=${email} requestId=${result.requestId}`,
			);

			return {
				success: true,
				message: 'Magic link sent successfully',
				requestId: result.requestId,
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

	async getGoogleAuthorizationUrl() {
		this.logger.log('Google OAuth URL requested');

		try {
			const url = await this.getOAuthAuthorizationUrlUseCase.execute('google');

			return {
				success: true,
				url,
			};
		} catch (error) {
			const message = this.getErrorMessage(error);
			this.logger.error(`Google OAuth URL generation failed: ${message}`);
			if (error instanceof HttpException) {
				throw error;
			}
			throw new UnauthorizedException('Unable to start Google login');
		}
	}

	async authenticateMagicLink(token: string): Promise<SessionInfo> {
		this.logger.log('Magic link authentication requested');
		try {
			const sessionInfo = await this.authenticateMagicLinkUseCase.execute(token);

			this.logger.log(`Magic link authentication completed for userId=${sessionInfo.userId}`);

			return sessionInfo;
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
		this.logger.log('Session validation requested');
		try {
			const sessionInfo = await this.validateSessionUseCase.execute(sessionToken);

			this.logger.log(`Session validation completed for userId=${sessionInfo.userId}`);

			return sessionInfo;
		} catch (error) {
			const message = this.getErrorMessage(error);
			this.logger.error(`Session validation failed: ${message}`);
			if (error instanceof HttpException) {
				throw error;
			}
			throw new UnauthorizedException('Invalid or expired session');
		}
	}

	async refreshSession(refreshToken: string): Promise<SessionInfo> {
		this.logger.log('Session refresh requested');
		try {
			const sessionInfo = await this.refreshSessionUseCase.execute(refreshToken);

			this.logger.log(`Session refresh completed for userId=${sessionInfo.userId}`);

			return sessionInfo;
		} catch (error) {
			this.logger.error(`Session refresh failed: ${error.message}`);
			throw new UnauthorizedException('Invalid or expired refresh token');
		}
	}

	async logout(sessionToken: string) {
		this.logger.log('Logout requested');
		try {
			await this.logoutUseCase.execute(sessionToken);
			this.logger.log('Logout completed');

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
