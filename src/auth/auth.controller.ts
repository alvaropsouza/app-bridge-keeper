import { Controller, Post, Get, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { AuthService, LoginDto, AuthenticateDto } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.initiateLogin(loginDto);
  }

  @Post('authenticate')
  async authenticate(@Body() authenticateDto: AuthenticateDto) {
    if (authenticateDto.type === 'magic_link') {
      return this.authService.authenticateMagicLink(authenticateDto.token);
    } else if (authenticateDto.type === 'session') {
      return this.authService.validateSession(authenticateDto.token);
    }
    throw new UnauthorizedException('Invalid authentication type');
  }

  @Post('logout')
  async logout(@Headers('authorization') authorization: string) {
    if (!authorization) {
      throw new UnauthorizedException('No authorization header provided');
    }

    // Extract token from "Bearer <token>" format
    const token = authorization.replace('Bearer ', '');
    return this.authService.logout(token);
  }

  @Get('me')
  async getMe(
    @Headers('authorization') authorization: string,
    @Headers('x-organization-id') organizationId: string,
  ) {
    if (!authorization) {
      throw new UnauthorizedException('No authorization header provided');
    }

    // First validate the session
    const token = authorization.replace('Bearer ', '');
    const session = await this.authService.validateSession(token);

    // Use organization ID from header or from session
    const orgId = organizationId || session.organizationId;

    // Get member information
    return this.authService.getMemberInfo(orgId, session.memberId);
  }

  @Get('validate')
  async validateSession(@Headers('authorization') authorization: string) {
    if (!authorization) {
      throw new UnauthorizedException('No authorization header provided');
    }

    const token = authorization.replace('Bearer ', '');
    return this.authService.validateSession(token);
  }
}
