import { Test, TestingModule } from '@nestjs/testing';
import { StytchService } from './stytch.service';
import { STYTCH_CONFIG } from '../config/stytch.config';

describe('StytchService', () => {
  let service: StytchService;

  const mockConfig = {
    projectId: 'test-project-id',
    secret: 'test-secret',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StytchService,
        {
          provide: STYTCH_CONFIG,
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<StytchService>(StytchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize with config', () => {
    expect(service.getClient()).toBeDefined();
  });

  describe('sendMagicLink', () => {
    it('should throw error when client is not initialized', async () => {
      const serviceWithoutClient = new StytchService({ projectId: '', secret: '' });
      await expect(serviceWithoutClient.sendMagicLink('test@example.com')).rejects.toThrow(
        'Stytch client not initialized',
      );
    });
  });

  describe('authenticateMagicLink', () => {
    it('should throw error when client is not initialized', async () => {
      const serviceWithoutClient = new StytchService({ projectId: '', secret: '' });
      await expect(serviceWithoutClient.authenticateMagicLink('token-123')).rejects.toThrow(
        'Stytch client not initialized',
      );
    });
  });

  describe('authenticateSession', () => {
    it('should throw error when client is not initialized', async () => {
      const serviceWithoutClient = new StytchService({ projectId: '', secret: '' });
      await expect(serviceWithoutClient.authenticateSession('token-123')).rejects.toThrow(
        'Stytch client not initialized',
      );
    });
  });

  describe('revokeSession', () => {
    it('should throw error when client is not initialized', async () => {
      const serviceWithoutClient = new StytchService({ projectId: '', secret: '' });
      await expect(serviceWithoutClient.revokeSession('token-123')).rejects.toThrow(
        'Stytch client not initialized',
      );
    });
  });
});
