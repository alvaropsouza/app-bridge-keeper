import { ApiProperty } from '@nestjs/swagger';
import { MAGIC_LINK_LOCALES, MagicLinkLocale } from '../locale.enum';

export class LoginDto {
  @ApiProperty({
    description: 'Email address of the user',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Preferred locale for the magic link content',
    enum: MAGIC_LINK_LOCALES,
    required: false,
    example: MagicLinkLocale.PT_BR,
  })
  locale?: MagicLinkLocale;
}

export class AuthenticateDto {
  @ApiProperty({
    description: 'Authentication token (magic link token or session token)',
    example: 'token_123abc...',
  })
  token: string;

  @ApiProperty({
    description:
      'Type of authentication (optional if auto-detect). Accepted values: magic_link, session',
    enum: ['magic_link', 'session'],
    example: 'magic_link',
    required: false,
  })
  type?: 'magic_link' | 'session';
}

export interface SessionInfo {
  sessionToken: string;
  userId: string;
  email?: string;
  name?: string;
  expiresAt: Date;
}
