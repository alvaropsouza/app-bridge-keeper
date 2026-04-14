import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { MAGIC_LINK_LOCALES, MagicLinkLocale } from '../locale.enum';

export class LoginDto {
	@ApiProperty({
		description: 'Email address of the user',
		example: 'user@example.com',
	})
	@IsEmail()
	email: string;

	@ApiProperty({
		description: 'Preferred locale for the magic link content',
		enum: MAGIC_LINK_LOCALES,
		required: false,
		example: MagicLinkLocale.PT_BR,
	})
	@IsOptional()
	@IsEnum(MagicLinkLocale)
	locale?: MagicLinkLocale;
}

export class AuthenticateDto {
	@ApiProperty({
		description: 'Authentication token (magic link token or session token)',
		example: 'token_123abc...',
	})
	@IsString()
	token: string;

	@ApiProperty({
		description: 'Refresh token returned by OAuth providers like Supabase',
		example: 'refresh_token_123abc...',
		required: false,
	})
	@IsOptional()
	@IsString()
	refreshToken?: string;

	@ApiProperty({
		description:
			'Type of authentication (optional if auto-detect). Accepted values: magic_link, session',
		enum: ['magic_link', 'session'],
		example: 'magic_link',
		required: false,
	})
	@IsOptional()
	@IsEnum(['magic_link', 'session'])
	type?: 'magic_link' | 'session';
}

export class RegisterDto {
	@ApiProperty({
		description: 'Full name of the user',
		example: 'Maria da Silva',
	})
	@IsString()
	name: string;

	@ApiProperty({
		description: 'Email address of the user',
		example: 'maria@empresa.com.br',
	})
	@IsEmail()
	email: string;
}

export class EnsureUserDto {
	@ApiProperty({
		description: 'Email address of the user',
		example: 'maria@empresa.com.br',
	})
	@IsEmail()
	email: string;

	@ApiProperty({
		description: 'Full name of the user',
		example: 'Maria da Silva',
		required: false,
	})
	@IsOptional()
	@IsString()
	name?: string;
}

export interface SessionInfo {
	sessionToken: string;
	refreshToken?: string;
	userId: string;
	email?: string;
	name?: string;
	expiresAt: Date;
}
