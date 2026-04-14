import { Inject, Injectable } from '@nestjs/common';
import type { AuthProvider } from '../auth-provider.interface';
import { AUTH_PROVIDER } from '../auth-provider.interface';

type EnsureUserInput = {
	email: string;
	name?: string;
};

@Injectable()
export class EnsureUserUseCase {
	constructor(@Inject(AUTH_PROVIDER) private readonly authProvider: AuthProvider) {}

	async execute(input: EnsureUserInput): Promise<void> {
		await this.authProvider.ensureUserExists(input.email, input.name);
	}
}
