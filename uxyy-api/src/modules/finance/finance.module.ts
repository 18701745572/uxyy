import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { AiLlmService } from '../ai/ai.llm';
import { AiErrorCorrectionController } from './controllers/ai-error-correction.controller';
import { AiErrorCorrectionService } from './services/ai-error-correction.service';
import { TaxReportController } from './controllers/tax-report.controller';
import { TaxReportService } from './services/tax-report.service';

@Module({
  imports: [AuthModule, CommonModule],
  controllers: [FinanceController, AiErrorCorrectionController, TaxReportController],
  providers: [FinanceService, AiLlmService, AiErrorCorrectionService, TaxReportService],
  exports: [FinanceService, AiErrorCorrectionService, TaxReportService],
})
export class FinanceModule {}
