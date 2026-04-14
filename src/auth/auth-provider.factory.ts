import { Injectable, Logger } from '@nestjs/common';
import type { AuthProvider } from './auth-provider.interface';
import { AuthProviderConfigService } from './auth-provider-config.service';
import { StytchAuthAdapter } from './stytch-auth.adapter';
import { SupabaseAuthAdapter } from './supabase-auth.adapter';

@Injectable()
export class AuthProviderFactory {
	private readonly logger = new Logger(AuthProviderFactory.name);

	constructor(private readonly authProviderConfigService: AuthProviderConfigService) {}

	createProvider(): AuthProvider {
		const selectedProvider = this.authProviderConfigService.getSelectedProvider();

		this.logger.log(`Auth provider selected: ${selectedProvider}`);

		if (selectedProvider === 'stytch') {
			return new StytchAuthAdapter(this.authProviderConfigService.getStytchConfig());
		}

		return new SupabaseAuthAdapter(this.authProviderConfigService.getSupabaseConfig());
	}
}
