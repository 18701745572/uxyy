import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PriceMonitorService } from './price-monitor.service';
import { InsightGeneratorService } from './insight-generator.service';

/**
 * 通知定时调度服务
 * 管理所有自动化通知任务的调度执行
 */
@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private readonly priceMonitorService: PriceMonitorService,
    private readonly insightGeneratorService: InsightGeneratorService,
  ) {}

  /**
   * 价格监控任务
   * 每天凌晨2点执行
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handlePriceMonitoring() {
    this.logger.log('触发定时任务：价格监控检查');
    await this.priceMonitorService.checkPriceFluctuations();
  }

  /**
   * 经营洞察生成任务
   * 每周一上午9点执行
   */
  @Cron('0 9 * * 1') // 每周一上午9点
  async handleWeeklyInsightGeneration() {
    this.logger.log('触发定时任务：生成每周经营洞察');
    await this.insightGeneratorService.generateWeeklyInsights();
  }

  /**
   * 手动触发价格监控（用于测试）
   */
  async manualTriggerPriceMonitoring() {
    this.logger.log('手动触发：价格监控检查');
    await this.priceMonitorService.checkPriceFluctuations();
  }

  /**
   * 手动触发经营洞察生成（用于测试）
   */
  async manualTriggerInsightGeneration() {
    this.logger.log('手动触发：生成经营洞察');
    await this.insightGeneratorService.generateWeeklyInsights();
  }
}
