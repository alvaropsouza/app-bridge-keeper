import { Inject, Injectable } from '@nestjs/common';
import { AUTH_PROVIDER } from '../auth-provider.interface';
import type { AuthProvider, LoginRequestResult } from '../auth-provider.interface';

type InitiateLoginInput = {
  email: string;
  locale?: string;
};

@Injectable()
export class InitiateLoginUseCase {
  constructor(@Inject(AUTH_PROVIDER) private readonly authProvider: AuthProvider) {}

  async execute(input: InitiateLoginInput): Promise<LoginRequestResult> {
    return this.authProvider.sendMagicLink(input.email, input.locale);
  }
}
