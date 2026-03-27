import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AUTH_PROVIDER } from './auth-provider.interface';
import { SupabaseAuthProvider } from './supabase-auth.provider';
import { SUPABASE_CONFIG } from 'src/config/supabase.config';

@Module({
  imports: [ConfigModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    SupabaseAuthProvider,
    {
      provide: AUTH_PROVIDER,
      useExisting: SupabaseAuthProvider,
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
  ],
  exports: [AuthService, AUTH_PROVIDER, SupabaseAuthProvider],
})
export class AuthModule {}
