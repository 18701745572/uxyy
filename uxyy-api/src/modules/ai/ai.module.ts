import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { FinanceModule } from '../finance/finance.module';
import { AI_DEFAULT_QUEUE, AI_DLQ_QUEUE } from './ai.constants';
import { AiController } from './ai.controller';
import { AiLlmService } from './ai.llm';
import { AiProcessor } from './ai.processor';
import { AiService } from './ai.service';
import { PredictionController } from './controllers/prediction.controller';
import { OpportunityPredictionService } from './services/opportunity-prediction.service';
import { ChurnPredictionService } from './services/churn-prediction.service';

@Module({
  imports: [
    DatabaseModule,
    FinanceModule,
    BullModule.registerQueue({ name: AI_DEFAULT_QUEUE }),
    BullModule.registerQueue({ name: AI_DLQ_QUEUE }),
  ],
  controllers: [AiController, PredictionController],
  providers: [
    AiService,
    AiLlmService,
    AiProcessor,
    OpportunityPredictionService,
    ChurnPredictionService,
  ],
  exports: [AiService, OpportunityPredictionService, ChurnPredictionService],
})
export class AiModule {}
