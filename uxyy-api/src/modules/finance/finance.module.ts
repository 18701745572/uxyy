import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { AiLlmService } from '../ai/ai.llm';
import { AiErrorCorrectionController } from './controllers/ai-error-correction.controller';
import { AiErrorCorrectionService } from './services/ai-error-correction.service';

@Module({
  controllers: [FinanceController, AiErrorCorrectionController],
  providers: [FinanceService, AiLlmService, AiErrorCorrectionService],
  exports: [FinanceService, AiErrorCorrectionService],
})
export class FinanceModule {}
