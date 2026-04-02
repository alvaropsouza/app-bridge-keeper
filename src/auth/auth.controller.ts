import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Query,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthenticateDto, EnsureUserDto, LoginDto, RegisterDto } from './dto/auth.dto';
import type { SessionInfo } from './dto/auth.dto';
import type { Request, Response } from 'express';

const SESSION_COOKIE = 'kab_session';
const REFRESH_COOKIE = 'kab_refresh';
const SERVICE_TOKEN_HEADER = 'x-service-token';
const isProd = process.env.NODE_ENV === 'production';
const REFRESH_COOKIE_DAYS = Number(process.env.AUTH_REFRESH_COOKIE_DAYS ?? 30);
const REFRESH_COOKIE_MAX_AGE_MS =
  Number.isFinite(REFRESH_COOKIE_DAYS) && REFRESH_COOKIE_DAYS > 0
    ? REFRESH_COOKIE_DAYS * 24 * 60 * 60 * 1000
    : 30 * 24 * 60 * 60 * 1000;

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

const extractRefreshToken = (req?: Request) => req?.cookies?.[REFRESH_COOKIE] || null;

const toUserPayload = (sessionInfo: SessionInfo) => ({
  userId: sessionInfo.userId,
  email: sessionInfo.email,
  name: sessionInfo.name,
  expiresAt: sessionInfo.expiresAt,
  sessionToken: sessionInfo.sessionToken, // Include token for localStorage fallback
});

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setSessionCookies(res: Response, sessionInfo: SessionInfo): void {
    const maxAge = Math.max(0, sessionInfo.expiresAt.getTime() - Date.now());
    res.cookie(SESSION_COOKIE, sessionInfo.sessionToken, buildCookieOptions(maxAge));

    if (sessionInfo.refreshToken) {
      res.cookie(
        REFRESH_COOKIE,
        sessionInfo.refreshToken,
        buildCookieOptions(REFRESH_COOKIE_MAX_AGE_MS),
      );
    }
  }

  private clearSessionCookies(req: Request, res: Response): void {
    if (req.cookies?.[SESSION_COOKIE]) {
      res.clearCookie(SESSION_COOKIE, buildCookieOptions());
    }

    if (req.cookies?.[REFRESH_COOKIE]) {
      res.clearCookie(REFRESH_COOKIE, buildCookieOptions());
    }
  }

  private assertInternalServiceRequest(serviceToken?: string): void {
    const expectedToken = process.env.INTERNAL_SERVICE_TOKEN?.trim();

    if (!expectedToken) {
      throw new ForbiddenException('INTERNAL_SERVICE_TOKEN is not configured');
    }

    if (!serviceToken || serviceToken !== expectedToken) {
      throw new UnauthorizedException('Invalid internal service token');
    }
  }

  @Post('register')
  @ApiOperation({ summary: 'Register user in the configured auth provider' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(
    @Body() registerDto: RegisterDto,
    @Headers(SERVICE_TOKEN_HEADER) serviceToken?: string,
  ) {
    this.assertInternalServiceRequest(serviceToken);
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Initiate login with email' })
  @ApiResponse({ status: 201, description: 'Login initiated successfully' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.initiateLogin(loginDto);
  }

  @Post('ensure-user')
  @ApiOperation({ summary: 'Ensure user exists in the configured auth provider by email' })
  @ApiResponse({ status: 201, description: 'User exists in the configured auth provider' })
  async ensureUser(
    @Body() ensureUserDto: EnsureUserDto,
    @Headers(SERVICE_TOKEN_HEADER) serviceToken?: string,
  ) {
    this.assertInternalServiceRequest(serviceToken);
    return this.authService.ensureUser(ensureUserDto);
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
      if (/^sess_/i.test(authenticateDto.token) || authenticateDto.token.split('.').length === 3) {
        finalType = 'session';
      } else {
        finalType = 'magic_link';
      }
    }

    if (finalType === 'magic_link') {
      const sessionInfo = await this.authService.authenticateMagicLink(authenticateDto.token);
      this.setSessionCookies(res, sessionInfo);
      return toUserPayload(sessionInfo);
    }
    if (finalType === 'session') {
      const sessionInfo = await this.authService.validateSession(authenticateDto.token);
      this.setSessionCookies(res, sessionInfo);
      return toUserPayload(sessionInfo);
    }
    throw new BadRequestException('Invalid authentication type. Expected magic_link or session.');
  }

  @Get('callback')
  @ApiOperation({ summary: 'Magic link callback endpoint (consumes token_hash or token)' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 400, description: 'Missing token parameter' })
  async magicLinkCallback(
    @Query('token_hash') tokenHash: string,
    @Query('token') token: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const callbackToken = tokenHash || token;

    if (!callbackToken) {
      throw new BadRequestException('Missing token in query parameters');
    }

    const sessionInfo = await this.authService.authenticateMagicLink(callbackToken);
    this.setSessionCookies(res, sessionInfo);
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
    this.clearSessionCookies(req, res);
    return result;
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user information' })
  @ApiResponse({ status: 200, description: 'User information retrieved successfully' })
  @ApiResponse({ status: 401, description: 'No authorization header provided' })
  async getMe(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = extractToken(authorization, req);
    const refreshToken = extractRefreshToken(req);
    if (!token) {
      if (refreshToken) {
        try {
          const refreshedSession = await this.authService.refreshSession(refreshToken);
          this.setSessionCookies(res, refreshedSession);
          return toUserPayload(refreshedSession);
        } catch {
          this.clearSessionCookies(req, res);
        }
      }

      this.clearSessionCookies(req, res);
      throw new UnauthorizedException('No authorization header or cookie provided');
    }

    try {
      const sessionInfo = await this.authService.validateSession(token);
      return toUserPayload(sessionInfo);
    } catch {
      if (refreshToken) {
        try {
          const refreshedSession = await this.authService.refreshSession(refreshToken);
          this.setSessionCookies(res, refreshedSession);
          return toUserPayload(refreshedSession);
        } catch {
          this.clearSessionCookies(req, res);
        }
      }

      if (!authorization) {
        this.clearSessionCookies(req, res);
      }

      throw new UnauthorizedException('Invalid or expired session');
    }
  }

  @Get('validate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate session token' })
  @ApiResponse({ status: 200, description: 'Session is valid' })
  @ApiResponse({ status: 401, description: 'No authorization header provided or invalid session' })
  async validateSession(
    @Headers('authorization') authorization: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = extractToken(authorization, req);
    const refreshToken = extractRefreshToken(req);

    console.log(
      '[Validate] Checking session. Has cookie:',
      !!req.cookies?.[SESSION_COOKIE],
      'Has auth header:',
      !!authorization,
    );

    if (!token) {
      console.log('[Validate] No token found, returning 401');
      if (refreshToken) {
        try {
          const refreshedSession = await this.authService.refreshSession(refreshToken);
          this.setSessionCookies(res, refreshedSession);
          return {
            valid: true,
            user: toUserPayload(refreshedSession),
            expiresAt: refreshedSession.expiresAt,
          };
        } catch {
          this.clearSessionCookies(req, res);
        }
      }

      this.clearSessionCookies(req, res);
      throw new UnauthorizedException('No authorization header or cookie provided');
    }

    try {
      const sessionInfo = await this.authService.validateSession(token);
      console.log('[Validate] Session valid. Expires at:', sessionInfo.expiresAt);
      return { valid: true, user: toUserPayload(sessionInfo), expiresAt: sessionInfo.expiresAt };
    } catch {
      if (refreshToken) {
        try {
          const refreshedSession = await this.authService.refreshSession(refreshToken);
          this.setSessionCookies(res, refreshedSession);
          return {
            valid: true,
            user: toUserPayload(refreshedSession),
            expiresAt: refreshedSession.expiresAt,
          };
        } catch {
          this.clearSessionCookies(req, res);
        }
      }

      if (!authorization) {
        this.clearSessionCookies(req, res);
      }

      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}
