import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { StytchService } from 'src/auth/stytch.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockStytchService = {
    sendMagicLink: jest.fn(),
    authenticateMagicLink: jest.fn(),
    authenticateSession: jest.fn(),
    revokeSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: StytchService,
          useValue: mockStytchService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initiateLogin', () => {
    it('should send magic link successfully', async () => {
      const loginDto = {
        email: 'test@example.com',
      };

      mockStytchService.sendMagicLink.mockResolvedValue({
        request_id: 'req-123',
      });

      const result = await service.initiateLogin(loginDto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Magic link sent successfully');
      expect(result.requestId).toBe('req-123');
      expect(mockStytchService.sendMagicLink).toHaveBeenCalledWith(loginDto.email);
    });

    it('should throw UnauthorizedException on failure', async () => {
      const loginDto = {
        email: 'test@example.com',
      };

      mockStytchService.sendMagicLink.mockRejectedValue(new Error('API error'));

      await expect(service.initiateLogin(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('authenticateMagicLink', () => {
    it('should authenticate magic link successfully', async () => {
      const token = 'magic-link-token';
      const mockResponse = {
        session_token: 'session-token',
        user_id: 'user-123',
      };

      mockStytchService.authenticateMagicLink.mockResolvedValue(mockResponse);

      const result = await service.authenticateMagicLink(token);

      expect(result.sessionToken).toBe('session-token');
      expect(result.userId).toBe('user-123');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should throw UnauthorizedException on invalid token', async () => {
      mockStytchService.authenticateMagicLink.mockRejectedValue(new Error('Invalid token'));

      await expect(service.authenticateMagicLink('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateSession', () => {
    it('should validate session successfully', async () => {
      const token = 'session-token';
      const mockResponse = {
        user: { user_id: 'user-123' },
        session: {
          expires_at: '2024-12-31T23:59:59Z',
        },
      };

      mockStytchService.authenticateSession.mockResolvedValue(mockResponse);

      const result = await service.validateSession(token);

      expect(result.sessionToken).toBe(token); // service returns input token
      expect(result.userId).toBe('user-123');
    });

    it('should throw UnauthorizedException on invalid session', async () => {
      mockStytchService.authenticateSession.mockRejectedValue(new Error('Invalid session'));

      await expect(service.validateSession('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke session successfully', async () => {
      const token = 'session-token';
      mockStytchService.revokeSession.mockResolvedValue({});

      const result = await service.logout(token);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Session revoked successfully');
      expect(mockStytchService.revokeSession).toHaveBeenCalledWith(token);
    });

    it('should throw UnauthorizedException on revoke failure', async () => {
      mockStytchService.revokeSession.mockRejectedValue(new Error('Revoke failed'));

      await expect(service.logout('token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
