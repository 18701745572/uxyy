import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { firstValueFrom, isObservable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {
    super();
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    if (this.config.get<string>('AUTH_DEV_BYPASS') === 'true') {
      const req = context.switchToHttp().getRequest<Express.Request>();
      req.user = { userId: 1, enterpriseId: 1, devBypass: true };
      return true;
    }

    const res = super.canActivate(context);
    if (typeof res === 'boolean') return res;
    if (res instanceof Promise) return res;
    if (isObservable(res)) return firstValueFrom(res);
    return !!res;
  }
}
