import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ExportService } from '../../common/services/export.service';
import { PdfExportService } from './services/pdf-export.service';

/**
 * 仅向其他业务模块导出 Export / PDF 能力，不注册任何 Controller。
 * 避免与 `src/common/common.module` 重复注册同一批 Controller（否则 Nest 会在本模块内解析 ExportController，缺少 AuditLogService 等依赖）。
 */
@Module({
  imports: [AuthModule],
  controllers: [],
  providers: [ExportService, PdfExportService],
  exports: [ExportService, PdfExportService],
})
export class CommonModule {}
