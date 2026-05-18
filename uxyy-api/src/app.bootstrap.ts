import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';

const cookieParser = require('cookie-parser');

const helmet = require('helmet');
import { ConfigService } from '@nestjs/config';
import type { Request, Response, NextFunction } from 'express';
import { CsrfGuard } from './common/guards/csrf.guard';
import { RateLimitInterceptor } from './common/interceptors/rate-limit.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';
import { MetricsService } from './common/metrics/metrics.service';

/** 默认 express.json 仅约 100kb；OCR 等任务在 JSON 中带 Base64 图，需放宽（与「发票 ≤5MB」+ 编码膨胀匹配） */
const HTTP_JSON_BODY_LIMIT = '12mb';

/**
 * 与 e2e / 生产共用的 HTTP 层配置（前缀、校验、Swagger）。
 * Swagger UI 挂在 /docs 与 /docs-json，排除全局前缀 /api/v1。
 */
export function configureApp(app: INestApplication): void {
  const configService = app.get(ConfigService);
  const isProduction = configService.get('NODE_ENV') === 'production';
  const logger = new Logger('Bootstrap');

  // 1. 安全中间件（最先应用）
  // Helmet 安全头
  app.use(
    helmet({
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
      crossOriginEmbedderPolicy: isProduction,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: {
        maxAge: 63072000,
        includeSubDomains: true,
        preload: true,
      },
      ieNoOpen: true,
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: true,
    }),
  );

  // Cookie 解析中间件（必须在 CSRF Guard 之前）
  app.use(cookieParser());

  // 请求上下文中间件（生成请求 ID）
  const requestContextMiddleware = new RequestContextMiddleware();
  app.use((req: Request, res: Response, next: NextFunction) => {
    requestContextMiddleware.use(req, res, next);
  });

  // Body 解析
  app.use(express.json({ limit: HTTP_JSON_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true, limit: HTTP_JSON_BODY_LIMIT }));

  app.enableShutdownHooks();

  // CORS 配置
  if (!isProduction) {
    app.enableCors({
      origin: true,
      credentials: true,
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-CSRF-Token',
        'X-Request-Id',
      ],
      exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'X-Request-Id',
      ],
    });
  } else {
    const allowedOrigins = (configService.get('ALLOWED_ORIGINS') ?? '')
      .split(',')
      .filter(Boolean);

    if (allowedOrigins.length === 0) {
      logger.warn(
        'ALLOWED_ORIGINS not set in production! CORS will be restricted.',
      );
    }

    app.enableCors({
      origin: allowedOrigins.length > 0 ? allowedOrigins : false,
      credentials: true,
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-CSRF-Token',
        'X-Request-Id',
      ],
      exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'X-Request-Id',
      ],
    });
  }

  // API 前缀
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'docs', method: RequestMethod.ALL },
      { path: 'docs-json', method: RequestMethod.ALL },
      { path: 'health', method: RequestMethod.ALL },
      { path: 'metrics', method: RequestMethod.ALL },
    ],
  });

  // 全局管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // 全局守卫和拦截器
  const csrfGuard = app.get(CsrfGuard);
  const rateLimitInterceptor = app.get(RateLimitInterceptor);
  const loggingInterceptor = app.get(LoggingInterceptor);
  const metricsService = app.get(MetricsService);

  app.useGlobalGuards(csrfGuard);
  app.useGlobalInterceptors(rateLimitInterceptor, loggingInterceptor);

  // 请求完成时的指标记录
  app.use((req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      metricsService.recordRequest(
        req.method,
        req.path,
        res.statusCode,
        duration,
      );
    });

    next();
  });

  // Swagger 文档
  const swaggerConfig = new DocumentBuilder()
    .setTitle('优效营 uxyy API')
    .setDescription('企业级 REST API')
    .setVersion('1.2.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  logger.log(
    `Application configured for ${isProduction ? 'production' : 'development'}`,
  );
}
