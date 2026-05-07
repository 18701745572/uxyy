import { Module } from '@nestjs/common';
import { ExportService } from './services/export.service';
import { ExportController } from './controllers/export.controller';
import { DatabaseModule } from '../modules/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService],
})
export class CommonModule {}
