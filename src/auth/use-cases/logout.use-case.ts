import { Inject, Injectable } from '@nestjs/common';
import type { AuthProvider } from '../auth-provider.interface';
import { AUTH_PROVIDER } from '../auth-provider.interface';

@Injectable()
export class LogoutUseCase {
	constructor(@Inject(AUTH_PROVIDER) private readonly authProvider: AuthProvider) {}

	async execute(sessionToken: string): Promise<void> {
		await this.authProvider.revokeSession(sessionToken);
	}
}
