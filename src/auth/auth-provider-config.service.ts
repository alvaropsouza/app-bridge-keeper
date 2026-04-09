import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SupabaseConfig } from 'src/config/supabase.config';
import type { StytchConfig } from 'src/config/stytch.config';

export type AuthProviderName = 'supabase' | 'stytch';

@Injectable()
export class AuthProviderConfigService {
  constructor(private readonly configService: ConfigService) {}

  getSelectedProvider(): AuthProviderName {
    const selectedProvider =
      this.configService.get<string>('AUTH_PROVIDER')?.trim().toLowerCase() ?? 'supabase';

    if (selectedProvider === 'supabase' || selectedProvider === 'stytch') {
      return selectedProvider;
    }

    throw new Error("Invalid AUTH_PROVIDER. Use 'supabase' or 'stytch'.");
  }

  getSupabaseConfig(): SupabaseConfig {
    return {
      url: this.getRequiredEnv('SUPABASE_URL'),
      publishableKey: this.getRequiredEnv('SUPABASE_PUBLISHABLE_KEY'),
      secretKey: this.configService.get<string>('SUPABASE_SECRET_KEY')?.trim(),
      frontendUrl: this.configService.get<string>('FRONTEND_URL')?.trim(),
    };
  }

  getStytchConfig(): StytchConfig {
    return {
      projectId: this.getRequiredEnv('STYTCH_PROJECT_ID'),
      secret: this.getRequiredEnv('STYTCH_SECRET'),
      frontendUrl: this.getRequiredEnv('FRONTEND_URL'),
    };
  }

  private getRequiredEnv(envName: string): string {
    const value = this.configService.get<string>(envName)?.trim();
    if (!value) {
      throw new Error(`Missing required env var: ${envName}`);
    }
    return value;
  }
}
