import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AI_DEFAULT_QUEUE } from './ai.constants';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiTaskProcessor } from './ai-task.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: AI_DEFAULT_QUEUE,
    }),
  ],
  controllers: [AiController],
  providers: [AiService, AiTaskProcessor],
  exports: [AiService],
})
export class AiModule {}
