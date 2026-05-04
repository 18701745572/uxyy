import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, type StrategyOptions } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    const secret = config.getOrThrow<string>('JWT_ACCESS_SECRET');
    const opts: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    };
    super(opts);
  }

  validate(payload: { sub?: string; enterpriseId?: number }) {
    const sub = payload.sub;
    if (sub === undefined) {
      throw new UnauthorizedException();
    }
    const userId = Number(sub);
    if (Number.isNaN(userId)) {
      throw new UnauthorizedException();
    }
    return {
      userId,
      enterpriseId: payload.enterpriseId,
    } satisfies Express.UserPayload;
  }
}
