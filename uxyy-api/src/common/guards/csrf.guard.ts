import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * CSRF Token 防护 Guard
 * 使用双提交 Cookie 模式：
 * 1. 服务器生成 CSRF Token 并设置到 Cookie (httpOnly: false, 前端可读)
 * 2. 前端从 Cookie 读取 Token 并添加到请求头 X-CSRF-Token
 * 3. 服务器验证请求头中的 Token 与 Cookie 中的 Token 是否匹配
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly logger = new Logger(CsrfGuard.name);
  private readonly csrfCookieName = 'XSRF-TOKEN';
  private readonly csrfHeaderName = 'x-csrf-token';
  private readonly secure: boolean;
  private readonly sameSite: 'strict' | 'lax' | 'none';

  constructor(private readonly config: ConfigService) {
    this.secure = this.config.get<string>('NODE_ENV') === 'production';
    this.sameSite = this.secure ? 'strict' : 'lax';
  }

  canActivate(context: ExecutionContext): boolean {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    // 跳过 GET/HEAD/OPTIONS 请求（这些请求不应该修改数据）
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      // 即使没有 CSRF Token 也生成一个，确保前端始终有最新的 Token
      this.generateAndSetToken(res);
      return true;
    }

    // 检查是否是公开端点（如登录、注册）
    if (this.isPublicEndpoint(req)) {
      return true;
    }

    const cookieToken = req.cookies?.[this.csrfCookieName];
    const headerToken = req.headers[this.csrfHeaderName] as string;

    // 验证 Token 是否存在
    if (!cookieToken || !headerToken) {
      this.logger.warn(
        `CSRF validation failed: missing token for ${req.method} ${req.path}`,
      );
      throw new ForbiddenException('CSRF token missing');
    }

    // 使用 timing-safe 比较防止时序攻击
    if (!this.timingSafeEqual(cookieToken, headerToken)) {
      this.logger.warn(
        `CSRF validation failed: token mismatch for ${req.method} ${req.path}`,
      );
      throw new ForbiddenException('CSRF token invalid');
    }

    // 验证通过后生成新的 Token（每次验证后刷新，增加安全性）
    this.generateAndSetToken(res);

    return true;
  }

  /**
   * 生成新的 CSRF Token 并设置到 Cookie
   */
  generateAndSetToken(res: Response): string {
    const token = this.generateToken();

    res.cookie(this.csrfCookieName, token, {
      httpOnly: false, // 前端需要读取
      secure: this.secure,
      sameSite: this.sameSite,
      maxAge: 24 * 60 * 60 * 1000, // 24 小时
      path: '/',
    });

    return token;
  }

  /**
   * 生成随机 CSRF Token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 时序安全的字符串比较，防止时序攻击
   */
  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    try {
      return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch {
      return false;
    }
  }

  /**
   * 检查是否是公开端点（不需要 CSRF 保护）
   */
  private isPublicEndpoint(req: Request): boolean {
    const publicPaths = [
      '/api/v1/auth/login',
      '/api/v1/auth/register',
      '/api/v1/auth/refresh',
      '/api/v1/auth/register-invite',
    ];

    return publicPaths.some(
      (path) => req.path === path || req.path.endsWith(path),
    );
  }
}
