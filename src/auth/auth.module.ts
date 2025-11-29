import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { StytchService } from './stytch.service.js';
import { STYTCH_CONFIG } from '../config/stytch.config.js';

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
