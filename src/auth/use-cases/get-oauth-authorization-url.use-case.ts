import { Inject, Injectable } from '@nestjs/common';
import { AUTH_PROVIDER, type AuthProvider, type SocialProvider } from '../auth-provider.interface';

@Injectable()
export class GetOAuthAuthorizationUrlUseCase {
  constructor(@Inject(AUTH_PROVIDER) private readonly authProvider: AuthProvider) {}

  async execute(provider: SocialProvider): Promise<string> {
    return this.authProvider.getOAuthAuthorizationUrl(provider);
  }
}
