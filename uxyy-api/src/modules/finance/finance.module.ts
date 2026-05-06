import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { AiLlmService } from '../ai/ai.llm';

@Module({
  controllers: [FinanceController],
  providers: [FinanceService, AiLlmService],
  exports: [FinanceService],
})
export class FinanceModule {}
