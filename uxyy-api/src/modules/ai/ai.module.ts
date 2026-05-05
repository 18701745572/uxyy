import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AI_DEFAULT_QUEUE, AI_DLQ_QUEUE } from './ai.constants';
import { AiController } from './ai.controller';
import { AiLlmService } from './ai.llm';
import { AiProcessor } from './ai.processor';
import { AiService } from './ai.service';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({ name: AI_DEFAULT_QUEUE }),
    BullModule.registerQueue({ name: AI_DLQ_QUEUE }),
  ],
  controllers: [AiController],
  providers: [AiService, AiLlmService, AiProcessor],
  exports: [AiService],
})
export class AiModule {}
