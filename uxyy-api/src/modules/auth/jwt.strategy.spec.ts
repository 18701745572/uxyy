import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';

// Mock resolveJwtAccessSecret to return a fixed secret
jest.mock('./jwt-access-secret', () => ({
  resolveJwtAccessSecret: jest.fn().mockReturnValue('test-access-secret'),
  resolveJwtRefreshSecret: jest.fn().mockReturnValue('test-refresh-secret'),
}));

function mockConfig(): Partial<ConfigService> {
  return {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  };
}

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    strategy = new JwtStrategy(mockConfig() as ConfigService);
  });

  describe('validate', () => {
    it('should return userId, enterpriseId, role from payload', async () => {
      const result = await strategy.validate({
        sub: '42',
        enterpriseId: 7,
        role: 'boss',
      });

      expect(result).toEqual({ userId: 42, enterpriseId: 7, role: 'boss' });
    });

    it('should canonicalize owner alias on JWT role claim to boss', async () => {
      const result = await strategy.validate({
        sub: '1',
        enterpriseId: 2,
        role: 'owner',
      });
      expect(result).toEqual({ userId: 1, enterpriseId: 2, role: 'boss' });
    });

    it('should return undefined enterpriseId and role when not in payload', async () => {
      const result = await strategy.validate({ sub: '1' });

      expect(result).toEqual({
        userId: 1,
        enterpriseId: undefined,
        role: undefined,
      });
    });

    it('should throw UnauthorizedException when sub is missing', () => {
      expect(() => strategy.validate({})).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when sub is not a valid number', () => {
      expect(() => strategy.validate({ sub: 'abc' })).toThrow(
        UnauthorizedException,
      );
    });

    it('should handle numeric sub strings', async () => {
      const result = await strategy.validate({ sub: '99' });
      expect(result.userId).toBe(99);
    });
  });
});
