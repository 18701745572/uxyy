import { Module } from '@nestjs/common';
import { ExportController } from './controllers/export.controller';
import { PdfExportController } from './controllers/pdf-export.controller';
import { ExportService } from './services/export.service';
import { PdfExportService } from './services/pdf-export.service';

@Module({
  controllers: [ExportController, PdfExportController],
  providers: [ExportService, PdfExportService],
  exports: [ExportService, PdfExportService],
})
export class CommonModule {}
