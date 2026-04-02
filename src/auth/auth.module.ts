import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AUTH_PROVIDER, type AuthProvider } from './auth-provider.interface';
import { AuthProviderConfigService } from './auth-provider-config.service';
import { AuthProviderFactory } from './auth-provider.factory';
import { RegisterUserUseCase } from './use-cases/register-user.use-case';
import { EnsureUserUseCase } from './use-cases/ensure-user.use-case';
import { InitiateLoginUseCase } from './use-cases/initiate-login.use-case';
import { AuthenticateMagicLinkUseCase } from './use-cases/authenticate-magic-link.use-case';
import { ValidateSessionUseCase } from './use-cases/validate-session.use-case';
import { LogoutUseCase } from './use-cases/logout.use-case';
import { RefreshSessionUseCase } from './use-cases/refresh-session.use-case';

@Module({
  imports: [ConfigModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthProviderConfigService,
    AuthProviderFactory,
    RegisterUserUseCase,
    EnsureUserUseCase,
    InitiateLoginUseCase,
    AuthenticateMagicLinkUseCase,
    ValidateSessionUseCase,
    RefreshSessionUseCase,
    LogoutUseCase,
    {
      provide: AUTH_PROVIDER,
      useFactory: (authProviderFactory: AuthProviderFactory): AuthProvider =>
        authProviderFactory.createProvider(),
      inject: [AuthProviderFactory],
    },
  ],
  exports: [AuthService, AUTH_PROVIDER],
})
export class AuthModule {}
