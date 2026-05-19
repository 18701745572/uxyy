import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

interface UserPayload {
  userId: number;
  enterpriseId?: number;
  role?: string;
  devBypass?: boolean;
}

/**
 * 限流记录结构
 */
interface RateLimitRecord {
  count: number;
  firstRequestTime: number;
  blockedUntil?: number;
}

/**
 * 请求频率限制拦截器
 * 防止暴力破解攻击
 *
 * 策略：
 * 1. 基于 IP 地址限流
 * 2. 基于用户 ID 限流（如果已登录）
 * 3. 不同端点使用不同的限流策略
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RateLimitInterceptor.name);

  // 内存存储（生产环境建议使用 Redis）
  private readonly ipStore = new Map<string, RateLimitRecord>();
  private readonly userStore = new Map<string, RateLimitRecord>();

  // 清理间隔（毫秒）
  private readonly cleanupInterval = 5 * 60 * 1000; // 5 分钟

  // 限流配置
  private readonly config: {
    // 登录端点：5 次/分钟，封禁 15 分钟
    login: { windowMs: number; maxRequests: number; blockDurationMs: number };
    // 注册端点：3 次/分钟，封禁 30 分钟
    register: {
      windowMs: number;
      maxRequests: number;
      blockDurationMs: number;
    };
    // 通用 API：100 次/分钟
    default: { windowMs: number; maxRequests: number; blockDurationMs: number };
    // 敏感操作（修改密码等）：10 次/分钟，封禁 30 分钟
    sensitive: {
      windowMs: number;
      maxRequests: number;
      blockDurationMs: number;
    };
  };

  constructor(private readonly configService: ConfigService) {
    this.config = {
      login: {
        windowMs: 60 * 1000, // 1 分钟
        maxRequests: 5,
        blockDurationMs: 15 * 60 * 1000, // 15 分钟
      },
      register: {
        windowMs: 60 * 1000,
        maxRequests: 3,
        blockDurationMs: 30 * 60 * 1000, // 30 分钟
      },
      default: {
        windowMs: 60 * 1000,
        maxRequests: 100,
        blockDurationMs: 5 * 60 * 1000, // 5 分钟
      },
      sensitive: {
        windowMs: 60 * 1000,
        maxRequests: 10,
        blockDurationMs: 30 * 60 * 1000, // 30 分钟
      },
    };

    // 启动定期清理
    this.startCleanupInterval();
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const now = Date.now();
    const clientIp = this.getClientIp(req);
    const userId = this.getUserId(req);
    const endpointType = this.getEndpointType(req);
    const limitConfig = this.config[endpointType];

    // 检查 IP 限流
    const ipKey = `ip:${clientIp}:${endpointType}`;
    const ipResult = this.checkRateLimit(ipKey, this.ipStore, limitConfig, now);

    if (ipResult.blocked) {
      this.logger.warn(
        `Rate limit exceeded for IP ${clientIp} on ${req.method} ${req.path}. ` +
          `Blocked until: ${new Date(ipResult.blockedUntil!).toISOString()}`,
      );
      this.setRateLimitHeaders(res, ipResult, limitConfig);
      throw new ForbiddenException(
        `请求过于频繁，请 ${Math.ceil((ipResult.blockedUntil! - now) / 1000)} 秒后再试`,
      );
    }

    // 检查用户限流（如果已登录）
    if (userId) {
      const userKey = `user:${userId}:${endpointType}`;
      const userResult = this.checkRateLimit(
        userKey,
        this.userStore,
        limitConfig,
        now,
      );

      if (userResult.blocked) {
        this.logger.warn(
          `Rate limit exceeded for user ${userId} on ${req.method} ${req.path}. ` +
            `Blocked until: ${new Date(userResult.blockedUntil!).toISOString()}`,
        );
        this.setRateLimitHeaders(res, userResult, limitConfig);
        throw new ForbiddenException(
          `请求过于频繁，请 ${Math.ceil((userResult.blockedUntil! - now) / 1000)} 秒后再试`,
        );
      }
    }

    // 设置响应头
    this.setRateLimitHeaders(res, ipResult, limitConfig);

    return next.handle().pipe(
      tap(() => {
        // 请求成功，记录到审计日志
        this.logger.debug(
          `Request allowed: ${req.method} ${req.path} from ${clientIp}`,
        );
      }),
      catchError((error) => {
        // 登录失败时增加失败计数
        if (endpointType === 'login' && error.status === 401) {
          this.incrementFailedAttempt(ipKey, this.ipStore, limitConfig, now);
          if (userId) {
            const userKey = `user:${userId}:${endpointType}`;
            this.incrementFailedAttempt(
              userKey,
              this.userStore,
              limitConfig,
              now,
            );
          }
        }
        return throwError(() => error);
      }),
    );
  }

  /**
   * 检查限流状态
   */
  private checkRateLimit(
    key: string,
    store: Map<string, RateLimitRecord>,
    config: { windowMs: number; maxRequests: number; blockDurationMs: number },
    now: number,
  ): {
    blocked: boolean;
    remaining: number;
    resetTime: number;
    blockedUntil?: number;
  } {
    const record = store.get(key);

    // 如果被封禁
    if (record?.blockedUntil && record.blockedUntil > now) {
      return {
        blocked: true,
        remaining: 0,
        resetTime: record.blockedUntil,
        blockedUntil: record.blockedUntil,
      };
    }

    // 清除过期的封禁
    if (record?.blockedUntil && record.blockedUntil <= now) {
      store.delete(key);
    }

    // 检查时间窗口
    if (record && now - record.firstRequestTime > config.windowMs) {
      // 重置计数
      store.set(key, { count: 1, firstRequestTime: now });
      return {
        blocked: false,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs,
      };
    }

    // 增加计数
    const newCount = (record?.count ?? 0) + 1;
    const firstRequestTime = record?.firstRequestTime ?? now;

    if (newCount > config.maxRequests) {
      // 触发限流，封禁
      const blockedUntil = now + config.blockDurationMs;
      store.set(key, {
        count: newCount,
        firstRequestTime,
        blockedUntil,
      });

      return {
        blocked: true,
        remaining: 0,
        resetTime: blockedUntil,
        blockedUntil,
      };
    }

    store.set(key, { count: newCount, firstRequestTime });

    return {
      blocked: false,
      remaining: config.maxRequests - newCount,
      resetTime: firstRequestTime + config.windowMs,
    };
  }

  /**
   * 增加失败计数（用于登录失败场景）
   */
  private incrementFailedAttempt(
    key: string,
    store: Map<string, RateLimitRecord>,
    config: { windowMs: number; maxRequests: number; blockDurationMs: number },
    now: number,
  ): void {
    const record = store.get(key);
    const newCount = (record?.count ?? 0) + 1;
    const firstRequestTime = record?.firstRequestTime ?? now;

    if (newCount > config.maxRequests) {
      const blockedUntil = now + config.blockDurationMs;
      store.set(key, {
        count: newCount,
        firstRequestTime,
        blockedUntil,
      });
    } else {
      store.set(key, { count: newCount, firstRequestTime });
    }
  }

  /**
   * 获取客户端 IP
   */
  private getClientIp(req: Request): string {
    // 优先从 X-Forwarded-For 获取（如果通过代理）
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }

    // 从 X-Real-IP 获取
    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string') {
      return realIp;
    }

    // 直接连接
    return req.ip ?? req.socket.remoteAddress ?? 'unknown';
  }

  /**
   * 获取用户 ID（从 JWT）
   */
  private getUserId(req: Request): string | undefined {
    const user = req.user as UserPayload | undefined;
    return user?.userId ? String(user.userId) : undefined;
  }

  /**
   * 根据请求路径确定端点类型
   */
  private getEndpointType(
    req: Request,
  ): 'login' | 'register' | 'sensitive' | 'default' {
    const path = req.path.toLowerCase();

    if (path.includes('/auth/login')) {
      return 'login';
    }

    if (path.includes('/auth/register')) {
      return 'register';
    }

    // 敏感操作
    const sensitivePaths = [
      '/auth/reset-password',
      '/auth/change-password',
      '/auth/switch-enterprise',
      '/enterprise-members',
    ];

    if (sensitivePaths.some((p) => path.includes(p))) {
      return 'sensitive';
    }

    return 'default';
  }

  /**
   * 设置限流响应头
   */
  private setRateLimitHeaders(
    res: Response,
    result: { blocked: boolean; remaining: number; resetTime: number },
    config: { windowMs: number; maxRequests: number },
  ): void {
    res.setHeader('X-RateLimit-Limit', String(config.maxRequests));
    res.setHeader(
      'X-RateLimit-Remaining',
      String(Math.max(0, result.remaining)),
    );
    res.setHeader(
      'X-RateLimit-Reset',
      String(Math.ceil(result.resetTime / 1000)),
    );
  }

  /**
   * 启动定期清理任务
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      this.cleanupStore(this.ipStore, now);
      this.cleanupStore(this.userStore, now);
    }, this.cleanupInterval);
  }

  /**
   * 清理过期的限流记录
   */
  private cleanupStore(store: Map<string, RateLimitRecord>, now: number): void {
    for (const [key, record] of store.entries()) {
      // 删除已过期的记录
      if (record.blockedUntil && record.blockedUntil < now) {
        store.delete(key);
      } else if (
        !record.blockedUntil &&
        now - record.firstRequestTime > this.config.default.windowMs * 2
      ) {
        // 删除长时间未使用的记录
        store.delete(key);
      }
    }
  }
}
