import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AUTH_PROVIDER } from './auth-provider.interface';
import { SupabaseAuthProvider } from './supabase-auth.provider';
import { StytchAuthProvider } from './stytch-auth.provider';
import { SUPABASE_CONFIG } from 'src/config/supabase.config';
import { STYTCH_CONFIG } from 'src/config/stytch.config';

@Module({
  imports: [ConfigModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    SupabaseAuthProvider,
    StytchAuthProvider,
    {
      provide: AUTH_PROVIDER,
      useFactory: (
        configService: ConfigService,
        supabaseProvider: SupabaseAuthProvider,
        stytchProvider: StytchAuthProvider,
      ) => {
        const selectedProvider =
          configService.get<string>('AUTH_PROVIDER')?.trim().toLowerCase() ?? 'supabase';

        if (selectedProvider === 'stytch') {
          return stytchProvider;
        }

        if (selectedProvider === 'supabase') {
          return supabaseProvider;
        }

        throw new Error("Invalid AUTH_PROVIDER. Use 'supabase' or 'stytch'.");
      },
      inject: [ConfigService, SupabaseAuthProvider, StytchAuthProvider],
    },
    {
      provide: SUPABASE_CONFIG,
      useFactory: (configService: ConfigService) => ({
        url: configService.get<string>('SUPABASE_URL'),
        publishableKey: configService.get<string>('SUPABASE_PUBLISHABLE_KEY'),
        secretKey: configService.get<string>('SUPABASE_SECRET_KEY'),
        frontendUrl: configService.get<string>('FRONTEND_URL'),
      }),
      inject: [ConfigService],
    },
    {
      provide: STYTCH_CONFIG,
      useFactory: (configService: ConfigService) => ({
        projectId: configService.get<string>('STYTCH_PROJECT_ID'),
        secret: configService.get<string>('STYTCH_SECRET'),
      }),
      inject: [ConfigService],
    },
  ],
  exports: [AuthService, AUTH_PROVIDER, SupabaseAuthProvider, StytchAuthProvider],
})
export class AuthModule {}
