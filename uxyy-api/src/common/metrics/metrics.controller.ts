import { Controller, Get, Logger } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../decorators/public.decorator';
import { MetricsService } from './metrics.service';

/**
 * 指标监控控制器
 * 提供应用性能指标的查询接口
 */
@ApiTags('metrics')
@Controller('metrics')
export class MetricsController {
  private readonly logger = new Logger(MetricsController.name);

  constructor(private readonly metricsService: MetricsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '获取应用性能指标（无需鉴权）' })
  getMetrics() {
    return this.metricsService.getMetrics();
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: '健康检查（包含基础指标）' })
  getHealthMetrics() {
    const metrics = this.metricsService.getMetrics();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime_seconds: metrics.uptime_seconds,
      summary: {
        total_requests: this.getCounterValue(
          metrics.counters as Record<string, number>,
          'http_requests_total',
        ),
        errors_4xx: this.getCounterValue(
          metrics.counters as Record<string, number>,
          'http_requests_errors_4xx',
        ),
        errors_5xx: this.getCounterValue(
          metrics.counters as Record<string, number>,
          'http_requests_errors_5xx',
        ),
      },
    };
  }

  private getCounterValue(
    counters: Record<string, number>,
    prefix: string,
  ): number {
    return Object.entries(counters)
      .filter(([key]) => key.startsWith(prefix))
      .reduce((sum, [, value]) => sum + value, 0);
  }
}
