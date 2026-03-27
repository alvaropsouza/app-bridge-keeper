import { Inject, Injectable } from '@nestjs/common';
import { AUTH_PROVIDER } from '../auth-provider.interface';
import type { AuthProvider } from '../auth-provider.interface';
import type { SessionInfo } from '../dto/auth.dto';

@Injectable()
export class ValidateSessionUseCase {
  constructor(@Inject(AUTH_PROVIDER) private readonly authProvider: AuthProvider) {}

  async execute(sessionToken: string): Promise<SessionInfo> {
    return this.authProvider.validateSession(sessionToken);
  }
}
