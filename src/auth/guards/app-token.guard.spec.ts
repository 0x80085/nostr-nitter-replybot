import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppTokenGuard } from './app-token.guard';

describe('AppTokenGuard', () => {
  let guard: AppTokenGuard;
  let configService: ConfigService;
  const mockAppToken = 'test-app-token-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppTokenGuard,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue(mockAppToken),
          },
        },
      ],
    }).compile();

    guard = module.get<AppTokenGuard>(AppTokenGuard);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    let mockExecutionContext: ExecutionContext;
    let mockRequest: { headers: Record<string, string | undefined> };

    beforeEach(() => {
      mockRequest = { headers: {} };
      const mockHttpArgumentsHost = {
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn(),
        getNext: jest.fn(),
      };

      mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue(mockHttpArgumentsHost),
        switchToRpc: jest.fn(),
        switchToWs: jest.fn(),
        getType: jest.fn(),
        getClass: jest.fn(),
        getHandler: jest.fn(),
        getArgs: jest.fn(),
        getArgByIndex: jest.fn(),
      };
    });

    it('should return true when valid bearer token is provided', () => {
      const getOrThrowSpy = jest.spyOn(configService, 'getOrThrow');
      mockRequest.headers.authorization = `Bearer ${mockAppToken}`;

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(getOrThrowSpy).toHaveBeenCalledWith('AUTH_APP_TOKEN');
    });

    it('should throw UnauthorizedException when authorization header is missing', () => {
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        new UnauthorizedException('Authorization header is missing'),
      );
    });

    it('should throw UnauthorizedException when authorization header format is invalid (no space)', () => {
      mockRequest.headers.authorization = 'BearerInvalidFormat';

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        new UnauthorizedException('Invalid authorization header format'),
      );
    });

    it('should throw UnauthorizedException when authorization header format is invalid (too many parts)', () => {
      mockRequest.headers.authorization = 'Bearer token extra';

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        new UnauthorizedException('Invalid authorization header format'),
      );
    });

    it('should throw UnauthorizedException when bearer type is invalid', () => {
      mockRequest.headers.authorization = `Basic ${mockAppToken}`;

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        new UnauthorizedException('Invalid authorization header format'),
      );
    });

    it('should throw UnauthorizedException when token is empty', () => {
      mockRequest.headers.authorization = 'Bearer ';

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        new UnauthorizedException('Invalid authorization header format'),
      );
    });

    it('should throw UnauthorizedException when token does not match app token', () => {
      mockRequest.headers.authorization = 'Bearer wrong-token';

      expect(() => guard.canActivate(mockExecutionContext)).toThrow(
        new UnauthorizedException('Invalid app token'),
      );
    });

    it('should be case insensitive for bearer type', () => {
      mockRequest.headers.authorization = `BEARER ${mockAppToken}`;

      const result = guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
    });
  });
});
