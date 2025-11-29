import { Controller, Post, Get, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService, LoginDto, AuthenticateDto } from './auth.service';

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
    if (authenticateDto.type === 'magic_link') {
      return this.authService.authenticateMagicLink(authenticateDto.token);
    } else if (authenticateDto.type === 'session') {
      return this.authService.validateSession(authenticateDto.token);
    }
    throw new UnauthorizedException('Invalid authentication type');
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

    // Extract token from "Bearer <token>" format
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

    // First validate the session
    const token = authorization.replace('Bearer ', '');
    const session = await this.authService.validateSession(token);

    // Get user information
    return this.authService.getUserInfo(session.userId);
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

    const token = authorization.replace('Bearer ', '');
    return this.authService.validateSession(token);
  }
}
