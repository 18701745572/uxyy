import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from '../modules/auth/auth.module';
import { DatabaseModule } from '../modules/database/database.module';
import { FinanceModule } from '../modules/finance/finance.module';
import { PdfExportController } from '../modules/common/controllers/pdf-export.controller';
import { PdfExportService } from '../modules/common/services/pdf-export.service';
import { AuditLogController } from './controllers/audit-log.controller';
import { ExportController } from './controllers/export.controller';
import { OperationAuditInterceptor } from './interceptors/operation-audit.interceptor';
import { AuditLogService } from './services/audit-log.service';
import { ExportService } from './services/export.service';

@Module({
  imports: [DatabaseModule, AuthModule, FinanceModule],
  controllers: [ExportController, AuditLogController, PdfExportController],
  providers: [
    ExportService,
    AuditLogService,
    PdfExportService,
    { provide: APP_INTERCEPTOR, useClass: OperationAuditInterceptor },
  ],
  exports: [ExportService, AuditLogService, PdfExportService],
})
export class CommonModule {}
