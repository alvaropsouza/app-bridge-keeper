import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AUTH_PROVIDER } from './auth-provider.interface';
import { StytchAuthProvider } from './stytch-auth.provider';
import { STYTCH_CONFIG } from '../config/stytch.config';

@Module({
  imports: [ConfigModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    StytchAuthProvider,
    {
      provide: AUTH_PROVIDER,
      useExisting: StytchAuthProvider,
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
  exports: [AuthService, AUTH_PROVIDER, StytchAuthProvider],
})
export class AuthModule {}
