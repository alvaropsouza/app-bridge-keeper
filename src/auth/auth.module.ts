import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { StytchService } from './stytch.service';
import { STYTCH_CONFIG } from '../config/stytch.config';

@Module({
  imports: [ConfigModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    StytchService,
    {
      provide: STYTCH_CONFIG,
      useFactory: (configService: ConfigService) => ({
        projectId: configService.get<string>('STYTCH_PROJECT_ID'),
        secret: configService.get<string>('STYTCH_SECRET'),
      }),
      inject: [ConfigService],
    },
  ],
  exports: [AuthService, StytchService],
})
export class AuthModule {}
