import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * 与 e2e / 生产共用的 HTTP 层配置（前缀、校验、Swagger）。
 * Swagger UI 挂在 /docs 与 /docs-json，排除全局前缀 /api/v1。
 */
export function configureApp(app: INestApplication): void {
  app.enableShutdownHooks();
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'docs', method: RequestMethod.ALL },
      { path: 'docs-json', method: RequestMethod.ALL },
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('优效营 uxyy API')
    .setDescription('MVP REST（Phase 0 基线）')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
}
