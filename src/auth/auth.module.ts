import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AUTH_PROVIDER, type AuthProvider } from './auth-provider.interface';
import { SupabaseAuthProvider } from './supabase-auth.provider';
import { StytchAuthProvider } from './stytch-auth.provider';
import { AuthProviderConfigService } from './auth-provider-config.service';

@Module({
  imports: [ConfigModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthProviderConfigService,
    {
      provide: AUTH_PROVIDER,
      useFactory: (authProviderConfigService: AuthProviderConfigService): AuthProvider => {
        const selectedProvider = authProviderConfigService.getSelectedProvider();
        if (selectedProvider === 'stytch') {
          return new StytchAuthProvider(authProviderConfigService.getStytchConfig());
        }

        return new SupabaseAuthProvider(authProviderConfigService.getSupabaseConfig());
      },
      inject: [AuthProviderConfigService],
    },
  ],
  exports: [AuthService, AUTH_PROVIDER],
})
export class AuthModule {}
