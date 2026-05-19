import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import {
  benchmark,
  loadTest,
  formatBenchmarkResult,
  formatLoadTestResult,
  checkPerformanceThresholds,
} from './performance.utils';

/**
 * 使用性能工具函数的基准测试示例
 */
describe('Performance Utils Benchmarks', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // 获取认证 token
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        phone: '13800138000',
        password: 'Test123456!',
      });
    
    authToken = response.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Benchmark Tests', () => {
    it('should benchmark GET /health endpoint', async () => {
      const result = await benchmark(
        'GET /health',
        async () => {
          await request(app.getHttpServer()).get('/health');
        },
        100, // 100 次迭代
      );

      console.log(formatBenchmarkResult(result));

      // 断言性能指标
      expect(result.avgTime).toBeLessThan(50); // 平均响应时间小于 50ms
      expect(result.p95Time).toBeLessThan(100); // P95 小于 100ms
    });

    it('should benchmark GET /crm/customers endpoint', async () => {
      const result = await benchmark(
        'GET /crm/customers',
        async () => {
          await request(app.getHttpServer())
            .get('/crm/customers?page=1&pageSize=10')
            .set('Authorization', `Bearer ${authToken}`);
        },
        50, // 50 次迭代
      );

      console.log(formatBenchmarkResult(result));

      expect(result.avgTime).toBeLessThan(200);
      expect(result.p95Time).toBeLessThan(400);
    });
  });

  describe('Load Tests', () => {
    it('should run load test on GET /crm/customers', async () => {
      const result = await loadTest(
        'GET /crm/customers Load Test',
        async () => {
          const startTime = Date.now();
          const response = await request(app.getHttpServer())
            .get('/crm/customers?page=1&pageSize=10')
            .set('Authorization', `Bearer ${authToken}`);
          const responseTime = Date.now() - startTime;
          
          return {
            success: response.status === 200,
            responseTime,
          };
        },
        10, // 10 个并发用户
        5,  // 每个用户 5 个请求
      );

      console.log(formatLoadTestResult(result));

      // 检查性能阈值
      const thresholdCheck = checkPerformanceThresholds(result, {
        maxAvgResponseTime: 300,
        minSuccessRate: 0.95,
        maxP95ResponseTime: 500,
        minRequestsPerSecond: 10,
      });

      expect(thresholdCheck.passed).toBe(true);
      if (!thresholdCheck.passed) {
        console.error('Performance threshold violations:', thresholdCheck.violations);
      }
    });

    it('should run high load test', async () => {
      const result = await loadTest(
        'High Load Test',
        async () => {
          const startTime = Date.now();
          const response = await request(app.getHttpServer())
            .get('/health');
          const responseTime = Date.now() - startTime;
          
          return {
            success: response.status === 200,
            responseTime,
          };
        },
        20, // 20 个并发用户
        10, // 每个用户 10 个请求
      );

      console.log(formatLoadTestResult(result));

      expect(result.successRate).toBeGreaterThan(0.95);
      expect(result.avgResponseTime).toBeLessThan(100);
    });
  });

  describe('Performance Comparison', () => {
    it('should compare different page sizes', async () => {
      const pageSizes = [5, 10, 20, 50];
      const results = [];

      for (const pageSize of pageSizes) {
        const result = await benchmark(
          `GET /crm/customers?pageSize=${pageSize}`,
          async () => {
            await request(app.getHttpServer())
              .get(`/crm/customers?page=1&pageSize=${pageSize}`)
              .set('Authorization', `Bearer ${authToken}`);
          },
          20,
        );

        results.push({ pageSize, ...result });
        console.log(formatBenchmarkResult(result));
      }

      // 验证性能随着 pageSize 增加而线性增长
      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1];
        const curr = results[i];
        const sizeRatio = curr.pageSize / prev.pageSize;
        const timeRatio = curr.avgTime / prev.avgTime;

        // 时间增长不应超过大小增长的 2 倍
        expect(timeRatio).toBeLessThan(sizeRatio * 2);
      }
    });
  });

  describe('Stress Test Scenarios', () => {
    it('should handle gradual load increase', async () => {
      const concurrentUsers = [5, 10, 15, 20, 25];
      const results = [];

      for (const users of concurrentUsers) {
        const result = await loadTest(
          `Load Test - ${users} Users`,
          async () => {
            const startTime = Date.now();
            const response = await request(app.getHttpServer())
              .get('/crm/customers?page=1&pageSize=5')
              .set('Authorization', `Bearer ${authToken}`);
            const responseTime = Date.now() - startTime;
            
            return {
              success: response.status === 200,
              responseTime,
            };
          },
          users,
          5,
        );

        results.push(result);
        console.log(formatLoadTestResult(result));

        // 短暂休息
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 验证性能不会随着负载增加而严重下降
      const baseline = results[0];
      const final = results[results.length - 1];

      // 最高负载下的平均响应时间不应超过最低负载的 5 倍
      expect(final.avgResponseTime).toBeLessThan(baseline.avgResponseTime * 5);
      
      // 所有负载级别的成功率都应该大于 90%
      results.forEach(r => {
        expect(r.successRate).toBeGreaterThan(0.9);
      });
    });
  });
});
