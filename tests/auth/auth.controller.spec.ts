import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from 'src/auth/auth.controller';
import { AuthService } from 'src/auth/auth.service';

const createMockResponse = () => ({
  cookie: jest.fn(),
  clearCookie: jest.fn(),
});

const createMockRequest = (cookieToken?: string) => ({
  cookies: cookieToken ? { kab_session: cookieToken } : {},
});

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    initiateLogin: jest.fn(),
    authenticateMagicLink: jest.fn(),
    validateSession: jest.fn(),
    logout: jest.fn(),
    getUserInfo: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should initiate login', async () => {
      const loginDto = {
        email: 'test@example.com',
      };

      const mockResult = {
        success: true,
        message: 'Magic link sent successfully',
        requestId: 'req-123',
      };

      mockAuthService.initiateLogin.mockResolvedValue(mockResult);

      const result = await controller.login(loginDto);

      expect(result).toEqual(mockResult);
      expect(mockAuthService.initiateLogin).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('authenticate', () => {
    it('should authenticate with magic link (auto-detect type)', async () => {
      const authenticateDto = {
        token: 'magic-link-token',
      };
      const response = createMockResponse();

      const mockResult = {
        sessionToken: 'session-token',
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test',
        expiresAt: new Date(),
      };

      mockAuthService.authenticateMagicLink.mockResolvedValue(mockResult);

      const result = await controller.authenticate(authenticateDto, response as any);

      expect(result).toEqual(mockResult);
      expect(mockAuthService.authenticateMagicLink).toHaveBeenCalledWith(authenticateDto.token);
      expect(response.cookie).toHaveBeenCalled();
    });

    it('should authenticate with session token', async () => {
      const authenticateDto = {
        token: 'session-token',
        type: 'session' as const,
      };
      const response = createMockResponse();

      const mockResult = {
        sessionToken: 'session-token',
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test',
        expiresAt: new Date(),
      };

      mockAuthService.validateSession.mockResolvedValue(mockResult);

      const result = await controller.authenticate(authenticateDto, response as any);

      expect(result).toEqual(mockResult);
      expect(mockAuthService.validateSession).toHaveBeenCalledWith(authenticateDto.token);
      expect(response.cookie).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid type', async () => {
      const authenticateDto = {
        token: 'token',
        type: 'invalid' as any,
      };

      await expect(
        controller.authenticate(authenticateDto, createMockResponse() as any),
      ).rejects.toThrow('Invalid authentication type');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const authorization = 'Bearer session-token';
      const mockResult = {
        success: true,
        message: 'Session revoked successfully',
      };
      const request = createMockRequest();
      const response = createMockResponse();

      mockAuthService.logout.mockResolvedValue(mockResult);

      const result = await controller.logout(authorization, request as any, response as any);

      expect(result).toEqual(mockResult);
      expect(mockAuthService.logout).toHaveBeenCalledWith('session-token');
      expect(response.clearCookie).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when no authorization header', async () => {
      await expect(
        controller.logout('', createMockRequest() as any, createMockResponse() as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getMe', () => {
    it('should return session info', async () => {
      const authorization = 'Bearer session-token';
      const mockSession = {
        sessionToken: 'session-token',
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test',
        expiresAt: new Date(),
      };
      mockAuthService.validateSession.mockResolvedValue(mockSession);
      const result = await controller.getMe(authorization, createMockRequest() as any);
      expect(result).toEqual(mockSession);
      expect(mockAuthService.validateSession).toHaveBeenCalledWith('session-token');
    });
    it('should throw UnauthorizedException when no authorization header', async () => {
      await expect(controller.getMe('', createMockRequest() as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateSession', () => {
    it('should validate session successfully and wrap response', async () => {
      const authorization = 'Bearer session-token';
      const mockResult = {
        sessionToken: 'session-token',
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test',
        expiresAt: new Date(),
      };
      mockAuthService.validateSession.mockResolvedValue(mockResult);
      const result = await controller.validateSession(authorization, createMockRequest() as any);
      expect(result.valid).toBe(true);
      expect(result.user).toEqual(mockResult);
      expect(mockAuthService.validateSession).toHaveBeenCalledWith('session-token');
    });
    it('should throw UnauthorizedException when no authorization header', async () => {
      await expect(controller.validateSession('', createMockRequest() as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
