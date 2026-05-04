import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { AI_DEFAULT_QUEUE } from './ai.constants';

@Injectable()
export class AiService {
  constructor(@InjectQueue(AI_DEFAULT_QUEUE) private readonly aiQueue: Queue) {}

  async getQueueStats() {
    const counts = await this.aiQueue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
      'paused',
    );
    return { queue: AI_DEFAULT_QUEUE, counts };
  }
}
