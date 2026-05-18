import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 性能指标数据点
 */
interface MetricPoint {
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

/**
 * 性能指标收集服务
 * 用于收集和报告应用性能指标
 */
@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly logger = new Logger(MetricsService.name);

  // 指标存储
  private counters = new Map<string, number>();
  private gauges = new Map<string, MetricPoint>();
  private histograms = new Map<string, number[]>();

  // 启动时间
  private startTime: number;

  constructor(private readonly configService: ConfigService) {
    this.startTime = Date.now();
  }

  onModuleInit() {
    this.logger.log('Metrics service initialized');

    // 定期输出系统指标（每 60 秒）
    setInterval(() => {
      this.outputSystemMetrics();
    }, 60000);
  }

  /**
   * 增加计数器
   */
  incrementCounter(
    name: string,
    value = 1,
    labels?: Record<string, string>,
  ): void {
    const key = this.getMetricKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  /**
   * 设置仪表盘值
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels);
    this.gauges.set(key, {
      value,
      timestamp: Date.now(),
      labels,
    });
  }

  /**
   * 记录直方图值
   */
  recordHistogram(
    name: string,
    value: number,
    labels?: Record<string, string>,
  ): void {
    const key = this.getMetricKey(name, labels);
    const values = this.histograms.get(key) || [];
    values.push(value);

    // 只保留最近 1000 个值
    if (values.length > 1000) {
      values.shift();
    }

    this.histograms.set(key, values);
  }

  /**
   * 记录请求指标
   */
  recordRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
  ): void {
    const labels = {
      method,
      path: this.sanitizePath(path),
      status: String(statusCode),
    };

    // 请求总数
    this.incrementCounter('http_requests_total', 1, labels);

    // 请求耗时直方图
    this.recordHistogram('http_request_duration_ms', duration, labels);

    // 按状态码分类
    if (statusCode >= 500) {
      this.incrementCounter('http_requests_errors_5xx', 1, {
        method,
        path: this.sanitizePath(path),
      });
    } else if (statusCode >= 400) {
      this.incrementCounter('http_requests_errors_4xx', 1, {
        method,
        path: this.sanitizePath(path),
      });
    }
  }

  /**
   * 记录数据库查询指标
   */
  recordDatabaseQuery(
    table: string,
    operation: string,
    duration: number,
    success: boolean,
  ): void {
    const labels = { table, operation, success: String(success) };

    this.incrementCounter('db_queries_total', 1, labels);
    this.recordHistogram('db_query_duration_ms', duration, labels);

    if (!success) {
      this.incrementCounter('db_queries_errors', 1, labels);
    }
  }

  /**
   * 获取所有指标
   */
  getMetrics(): Record<string, unknown> {
    const uptime = Date.now() - this.startTime;

    return {
      uptime_ms: uptime,
      uptime_seconds: Math.floor(uptime / 1000),
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(
        Array.from(this.gauges.entries()).map(([k, v]) => [k, v.value]),
      ),
      histograms: Object.fromEntries(
        Array.from(this.histograms.entries()).map(([k, v]) => [
          k,
          {
            count: v.length,
            sum: v.reduce((a, b) => a + b, 0),
            avg: v.length > 0 ? v.reduce((a, b) => a + b, 0) / v.length : 0,
            min: v.length > 0 ? Math.min(...v) : 0,
            max: v.length > 0 ? Math.max(...v) : 0,
            p95: this.calculatePercentile(v, 0.95),
            p99: this.calculatePercentile(v, 0.99),
          },
        ]),
      ),
    };
  }

  /**
   * 输出系统指标到日志
   */
  private outputSystemMetrics(): void {
    const metrics = this.getMetrics();

    this.logger.log('System metrics', {
      type: 'metrics',
      ...metrics,
    });
  }

  /**
   * 计算百分位数
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * 生成指标键
   */
  private getMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }

    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${labelStr}}`;
  }

  /**
   * 清理路径（移除 ID 等动态部分）
   */
  private sanitizePath(path: string): string {
    // 将数字 ID 替换为 :id
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(
        /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi,
        ':uuid',
      );
  }
}
