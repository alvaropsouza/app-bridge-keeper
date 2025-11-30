import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Query,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthenticateDto, LoginDto } from './dto/auth.dto';

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
  async authenticate(@Body() authenticateDto: AuthenticateDto) {
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
      return this.authService.authenticateMagicLink(authenticateDto.token);
    }
    if (finalType === 'session') {
      return this.authService.validateSession(authenticateDto.token);
    }
    throw new BadRequestException('Invalid authentication type. Expected magic_link or session.');
  }

  @Get('callback')
  @ApiOperation({ summary: 'Magic link callback endpoint (consumes stytch_token query param)' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 400, description: 'Missing stytch_token parameter' })
  async magicLinkCallback(@Query('stytch_token') stytchToken: string) {
    if (!stytchToken) {
      throw new BadRequestException('Missing stytch_token in query parameters');
    }
    return this.authService.authenticateMagicLink(stytchToken);
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate session' })
  @ApiResponse({ status: 201, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'No authorization header provided' })
  async logout(@Headers('authorization') authorization: string) {
    if (!authorization) {
      throw new UnauthorizedException('No authorization header provided');
    }

    const token = authorization.replace('Bearer ', '');
    return this.authService.logout(token);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user information' })
  @ApiResponse({ status: 200, description: 'User information retrieved successfully' })
  @ApiResponse({ status: 401, description: 'No authorization header provided' })
  async getMe(@Headers('authorization') authorization: string) {
    if (!authorization) {
      throw new UnauthorizedException('No authorization header provided');
    }

    const token = authorization.replace('Bearer ', '');
    return this.authService.validateSession(token);
  }

  @Get('validate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate session token' })
  @ApiResponse({ status: 200, description: 'Session is valid' })
  @ApiResponse({ status: 401, description: 'No authorization header provided or invalid session' })
  async validateSession(@Headers('authorization') authorization: string) {
    if (!authorization) {
      throw new UnauthorizedException('No authorization header provided');
    }

    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : authorization;
    const sessionInfo = await this.authService.validateSession(token);
    return { valid: true, session: sessionInfo };
  }
}
