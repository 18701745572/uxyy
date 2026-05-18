import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';

/**
 * Helmet 安全中间件配置
 * 提供全面的 HTTP 安全头保护
 */
@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);
  private helmetMiddleware: ReturnType<typeof helmet>;

  constructor(private readonly configService: ConfigService) {
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    this.helmetMiddleware = helmet({
      // 内容安全策略
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      // 跨域隔离
      crossOriginEmbedderPolicy: isProduction,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      // DNS 预取控制
      dnsPrefetchControl: { allow: false },
      // 框架嵌入控制
      frameguard: { action: 'deny' },
      // 隐藏 Powered-By
      hidePoweredBy: true,
      // HTTP 严格传输安全
      hsts: {
        maxAge: 63072000, // 2年
        includeSubDomains: true,
        preload: true,
      },
      // IE 兼容模式
      ieNoOpen: true,
      // 禁止 MIME 类型嗅探
      noSniff: true,
      // 来源引用策略
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      // XSS 过滤
      xssFilter: true,
    });
  }

  use(req: Request, res: Response, next: NextFunction): void {
    // 添加额外的安全头
    res.setHeader(
      'Permissions-Policy',
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
    );

    // 应用 Helmet
    this.helmetMiddleware(req, res, next);
  }
}
