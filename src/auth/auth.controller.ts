import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Query,
  BadRequestException,
  UnauthorizedException,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthenticateDto, LoginDto } from './dto/auth.dto';
import type { Request, Response } from 'express';

const SESSION_COOKIE = 'kab_session';
const isProd = process.env.NODE_ENV === 'production';

const buildCookieOptions = (maxAge?: number) => {
  const options = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? ('none' as const) : ('lax' as const),
    path: '/',
    ...(maxAge ? { maxAge } : {}),
  };

  console.log('[Cookie] Building cookie options:', {
    ...options,
    maxAge: maxAge ? `${Math.floor(maxAge / 1000 / 60)} minutes` : 'session',
  });

  return options;
};

const extractToken = (authorization?: string, req?: Request) => {
  if (authorization) {
    return authorization.startsWith('Bearer ') ? authorization.slice(7) : authorization;
  }

  const cookieToken = req?.cookies?.[SESSION_COOKIE];
  return cookieToken || null;
};

const toUserPayload = (sessionInfo) => ({
  userId: sessionInfo.userId,
  email: sessionInfo.email,
  name: sessionInfo.name,
  expiresAt: sessionInfo.expiresAt,
});

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Initiate login with email' })
  @ApiResponse({ status: 201, description: 'Login initiated successfully' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.initiateLogin(loginDto);
  }

  @Post('authenticate')
  @ApiOperation({ summary: 'Authenticate with magic link or session token' })
  @ApiResponse({ status: 201, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Invalid authentication type' })
  async authenticate(
    @Body() authenticateDto: AuthenticateDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawType = authenticateDto.type?.toLowerCase();
    let normalizedType: string | undefined;
    if (rawType === 'magiclink') normalizedType = 'magic_link';
    else if (rawType === 'session_token') normalizedType = 'session';
    else normalizedType = rawType;

    let finalType = normalizedType as 'magic_link' | 'session' | undefined;
    if (!finalType) {
      if (/^sess_/i.test(authenticateDto.token)) {
        finalType = 'session';
      } else {
        finalType = 'magic_link';
      }
    }

    if (finalType === 'magic_link') {
      const sessionInfo = await this.authService.authenticateMagicLink(authenticateDto.token);
      const maxAge = Math.max(0, sessionInfo.expiresAt.getTime() - Date.now());
      console.log(
        '[Authenticate] Magic link authenticated. Setting cookie with maxAge:',
        Math.floor(maxAge / 1000 / 60),
        'minutes',
      );
      res.cookie(SESSION_COOKIE, sessionInfo.sessionToken, buildCookieOptions(maxAge));
      return toUserPayload(sessionInfo);
    }
    if (finalType === 'session') {
      const sessionInfo = await this.authService.validateSession(authenticateDto.token);
      const maxAge = Math.max(0, sessionInfo.expiresAt.getTime() - Date.now());
      console.log(
        '[Authenticate] Session validated. Setting cookie with maxAge:',
        Math.floor(maxAge / 1000 / 60),
        'minutes',
      );
      res.cookie(SESSION_COOKIE, sessionInfo.sessionToken, buildCookieOptions(maxAge));
      return toUserPayload(sessionInfo);
    }
    throw new BadRequestException('Invalid authentication type. Expected magic_link or session.');
  }

  @Get('callback')
  @ApiOperation({ summary: 'Magic link callback endpoint (consumes stytch_token query param)' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 400, description: 'Missing stytch_token parameter' })
  async magicLinkCallback(
    @Query('stytch_token') stytchToken: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!stytchToken) {
      throw new BadRequestException('Missing stytch_token in query parameters');
    }
    const sessionInfo = await this.authService.authenticateMagicLink(stytchToken);
    const maxAge = Math.max(0, sessionInfo.expiresAt.getTime() - Date.now());
    res.cookie(SESSION_COOKIE, sessionInfo.sessionToken, buildCookieOptions(maxAge));
    return toUserPayload(sessionInfo);
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate session' })
  @ApiResponse({ status: 201, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'No authorization header provided' })
  async logout(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = extractToken(authorization, req);
    if (!token) {
      throw new UnauthorizedException('No authorization header or cookie provided');
    }

    const result = await this.authService.logout(token);
    res.clearCookie(SESSION_COOKIE, buildCookieOptions());
    return result;
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user information' })
  @ApiResponse({ status: 200, description: 'User information retrieved successfully' })
  @ApiResponse({ status: 401, description: 'No authorization header provided' })
  async getMe(@Headers('authorization') authorization: string, @Req() req: Request) {
    const token = extractToken(authorization, req);
    if (!token) {
      throw new UnauthorizedException('No authorization header or cookie provided');
    }

    const sessionInfo = await this.authService.validateSession(token);
    return toUserPayload(sessionInfo);
  }

  @Get('validate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate session token' })
  @ApiResponse({ status: 200, description: 'Session is valid' })
  @ApiResponse({ status: 401, description: 'No authorization header provided or invalid session' })
  async validateSession(@Headers('authorization') authorization: string, @Req() req: Request) {
    const token = extractToken(authorization, req);

    console.log(
      '[Validate] Checking session. Has cookie:',
      !!req.cookies?.[SESSION_COOKIE],
      'Has auth header:',
      !!authorization,
    );

    if (!token) {
      console.log('[Validate] No token found, returning 401');
      throw new UnauthorizedException('No authorization header or cookie provided');
    }

    const sessionInfo = await this.authService.validateSession(token);
    console.log('[Validate] Session valid. Expires at:', sessionInfo.expiresAt);
    return { valid: true, user: toUserPayload(sessionInfo), expiresAt: sessionInfo.expiresAt };
  }
}
