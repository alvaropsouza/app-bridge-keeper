import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AUTH_PROVIDER, type AuthProvider } from './auth-provider.interface';
import { SupabaseAuthProvider } from './supabase-auth.provider';
import { StytchAuthProvider } from './stytch-auth.provider';
import type { SupabaseConfig } from 'src/config/supabase.config';
import type { StytchConfig } from 'src/config/stytch.config';

const assertRequiredEnv = (value: string | undefined, envName: string): string => {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`Missing required env var: ${envName}`);
  }
  return normalized;
};

@Module({
  imports: [ConfigModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: AUTH_PROVIDER,
      useFactory: (configService: ConfigService): AuthProvider => {
        const selectedProvider =
          configService.get<string>('AUTH_PROVIDER')?.trim().toLowerCase() ?? 'supabase';

        if (selectedProvider !== 'supabase' && selectedProvider !== 'stytch') {
          throw new Error("Invalid AUTH_PROVIDER. Use 'supabase' or 'stytch'.");
        }

        if (selectedProvider === 'stytch') {
          const stytchConfig: StytchConfig = {
            projectId: assertRequiredEnv(
              configService.get<string>('STYTCH_PROJECT_ID'),
              'STYTCH_PROJECT_ID',
            ),
            secret: assertRequiredEnv(configService.get<string>('STYTCH_SECRET'), 'STYTCH_SECRET'),
          };

          return new StytchAuthProvider(stytchConfig);
        }

        const supabaseConfig: SupabaseConfig = {
          url: assertRequiredEnv(configService.get<string>('SUPABASE_URL'), 'SUPABASE_URL'),
          publishableKey: assertRequiredEnv(
            configService.get<string>('SUPABASE_PUBLISHABLE_KEY'),
            'SUPABASE_PUBLISHABLE_KEY',
          ),
          secretKey: configService.get<string>('SUPABASE_SECRET_KEY'),
          frontendUrl: configService.get<string>('FRONTEND_URL'),
        };

        return new SupabaseAuthProvider(supabaseConfig);
      },
      inject: [ConfigService],
    },
  ],
  exports: [AuthService, AUTH_PROVIDER],
})
export class AuthModule {}
