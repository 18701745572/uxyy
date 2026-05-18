import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../modules/auth/auth.module';
import { DatabaseModule } from '../modules/database/database.module';
import { FinanceModule } from '../modules/finance/finance.module';
import { PdfExportController } from '../modules/common/controllers/pdf-export.controller';
import { PdfExportService } from '../modules/common/services/pdf-export.service';
import { AuditLogController } from './controllers/audit-log.controller';
import { ExportController } from './controllers/export.controller';
import { OperationAuditInterceptor } from './interceptors/operation-audit.interceptor';
import { RateLimitInterceptor } from './interceptors/rate-limit.interceptor';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { CsrfGuard } from './guards/csrf.guard';
import { AuditLogService } from './services/audit-log.service';
import { ExportService } from './services/export.service';
import { MetricsModule } from './metrics/metrics.module';
import { LoggerModule } from './logger/logger.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    AuthModule,
    FinanceModule,
    MetricsModule,
    LoggerModule,
  ],
  controllers: [ExportController, AuditLogController, PdfExportController],
  providers: [
    ExportService,
    AuditLogService,
    PdfExportService,
    CsrfGuard,
    RateLimitInterceptor,
    LoggingInterceptor,
    { provide: APP_INTERCEPTOR, useClass: OperationAuditInterceptor },
  ],
  exports: [
    ExportService,
    AuditLogService,
    PdfExportService,
    CsrfGuard,
    RateLimitInterceptor,
    LoggingInterceptor,
    MetricsModule,
    LoggerModule,
  ],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 中间件配置（如果需要）
  }
}
