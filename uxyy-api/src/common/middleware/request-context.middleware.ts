import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * 请求上下文存储
 * 用于在异步调用链中传递请求信息
 */
export interface RequestContext {
  requestId: string;
  userId?: string;
  enterpriseId?: string;
  ip: string;
  userAgent?: string;
  startTime: number;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

/**
 * 获取当前请求上下文
 */
export function getCurrentContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * 请求上下文中间件
 * - 生成唯一请求 ID
 * - 记录请求开始时间
 * - 存储请求上下文供后续使用
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestContextMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    // 优先使用客户端传入的请求 ID，否则生成新的
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();

    // 将请求 ID 添加到响应头
    res.setHeader('X-Request-Id', requestId);

    const context: RequestContext = {
      requestId,
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
      startTime: Date.now(),
    };

    // 如果已认证，添加用户信息
    const user = req.user as { userId?: number; enterpriseId?: number } | undefined;
    if (user) {
      context.userId = user.userId?.toString();
      context.enterpriseId = user.enterpriseId?.toString();
    }

    // 将请求 ID 附加到请求对象
    (req as Request & { id: string }).id = requestId;

    // 在响应完成时记录请求耗时
    res.on('finish', () => {
      const duration = Date.now() - context.startTime;
      const statusCode = res.statusCode;

      // 慢请求警告（超过 1 秒）
      if (duration > 1000) {
        this.logger.warn(
          `Slow request detected: ${req.method} ${req.url} - ${duration}ms`,
          {
            requestId,
            method: req.method,
            url: req.url,
            statusCode,
            duration,
          },
        );
      }
    });

    // 在异步上下文中运行
    asyncLocalStorage.run(context, () => {
      next();
    });
  }

  /**
   * 获取客户端 IP
   */
  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string') {
      return realIp;
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  }
}
