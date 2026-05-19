import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

/**
 * API 负载测试
 * 模拟高并发场景下的系统表现
 */
describe('API Load Tests', () => {
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

  describe('Read Load Tests', () => {
    it('should handle 100 concurrent GET requests to /crm/customers', async () => {
      const concurrentRequests = 100;
      const requests = Array(concurrentRequests).fill(null).map(() =>
        request(app.getHttpServer())
          .get('/crm/customers?page=1&pageSize=10')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      const successResponses = responses.filter(r => r.status === 200);
      const successRate = successResponses.length / concurrentRequests;
      const avgResponseTime = totalTime / concurrentRequests;

      console.log(`Load Test Results (100 concurrent GET):`);
      console.log(`  Total time: ${totalTime}ms`);
      console.log(`  Success rate: ${(successRate * 100).toFixed(2)}%`);
      console.log(`  Average response time: ${avgResponseTime.toFixed(2)}ms`);

      expect(successRate).toBeGreaterThan(0.95); // 95% 成功率
      expect(totalTime).toBeLessThan(10000); // 10 秒内完成
    });

    it('should handle sequential burst requests', async () => {
      const burstSize = 50;
      const responseTimes: number[] = [];

      for (let i = 0; i < burstSize; i++) {
        const startTime = Date.now();
        
        await request(app.getHttpServer())
          .get('/crm/customers?page=1&pageSize=5')
          .set('Authorization', `Bearer ${authToken}`);
        
        responseTimes.push(Date.now() - startTime);
      }

      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);

      console.log(`Burst Test Results (50 sequential requests):`);
      console.log(`  Average response time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`  Max response time: ${maxResponseTime}ms`);

      expect(avgResponseTime).toBeLessThan(300);
      expect(maxResponseTime).toBeLessThan(1000);
    });
  });

  describe('Write Load Tests', () => {
    it('should handle 20 concurrent POST requests', async () => {
      const concurrentRequests = 20;
      const timestamp = Date.now();
      
      const requests = Array(concurrentRequests).fill(null).map((_, i) =>
        request(app.getHttpServer())
          .post('/crm/customers')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: `负载测试客户_${timestamp}_${i}`,
            phone: `138${String(Math.random()).slice(2, 11)}`,
            contactPerson: '测试',
            address: '测试地址',
            type: 'enterprise',
            level: 'regular',
            source: 'manual',
          })
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      const successResponses = responses.filter(r => r.status === 201 || r.status === 200);
      const conflictResponses = responses.filter(r => r.status === 409); // 重复数据
      const successRate = (successResponses.length + conflictResponses.length) / concurrentRequests;

      console.log(`Write Load Test Results (20 concurrent POST):`);
      console.log(`  Total time: ${totalTime}ms`);
      console.log(`  Success rate: ${(successRate * 100).toFixed(2)}%`);
      console.log(`  Created: ${successResponses.length}`);
      console.log(`  Conflicts: ${conflictResponses.length}`);

      expect(successRate).toBeGreaterThan(0.9);
      expect(totalTime).toBeLessThan(10000);
    });
  });

  describe('Mixed Load Tests', () => {
    it('should handle mixed read/write load', async () => {
      const readRequests = 30;
      const writeRequests = 10;
      const timestamp = Date.now();

      const requests = [
        ...Array(readRequests).fill(null).map(() =>
          request(app.getHttpServer())
            .get('/crm/customers?page=1&pageSize=10')
            .set('Authorization', `Bearer ${authToken}`)
        ),
        ...Array(writeRequests).fill(null).map((_, i) =>
          request(app.getHttpServer())
            .post('/crm/customers')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              name: `混合测试_${timestamp}_${i}`,
              phone: `139${String(Math.random()).slice(2, 11)}`,
              contactPerson: '测试',
              address: '测试地址',
              type: 'enterprise',
              level: 'regular',
              source: 'manual',
            })
        ),
      ];

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      const successResponses = responses.filter(r => r.status >= 200 && r.status < 300);
      const successRate = successResponses.length / requests.length;

      console.log(`Mixed Load Test Results (${readRequests} reads, ${writeRequests} writes):`);
      console.log(`  Total time: ${totalTime}ms`);
      console.log(`  Success rate: ${(successRate * 100).toFixed(2)}%`);

      expect(successRate).toBeGreaterThan(0.9);
      expect(totalTime).toBeLessThan(15000);
    });
  });

  describe('Stress Tests', () => {
    it('should handle increasing load gradually', async () => {
      const loadLevels = [10, 20, 30, 40, 50];
      const results: Array<{ load: number; avgTime: number; successRate: number }> = [];

      for (const load of loadLevels) {
        const requests = Array(load).fill(null).map(() =>
          request(app.getHttpServer())
            .get('/crm/customers?page=1&pageSize=5')
            .set('Authorization', `Bearer ${authToken}`)
        );

        const startTime = Date.now();
        const responses = await Promise.all(requests);
        const totalTime = Date.now() - startTime;

        const successCount = responses.filter(r => r.status === 200).length;
        const successRate = successCount / load;
        const avgTime = totalTime / load;

        results.push({ load, avgTime, successRate });

        // 短暂休息，避免过度压力
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log('Stress Test Results (Gradual Load Increase):');
      results.forEach(r => {
        console.log(`  Load: ${r.load}, Avg Time: ${r.avgTime.toFixed(2)}ms, Success Rate: ${(r.successRate * 100).toFixed(2)}%`);
      });

      // 验证性能不会随着负载增加而严重下降
      const firstResult = results[0];
      const lastResult = results[results.length - 1];
      
      // 最高负载下的平均响应时间不应超过最低负载的 5 倍
      expect(lastResult.avgTime).toBeLessThan(firstResult.avgTime * 5);
      
      // 所有负载级别的成功率都应该大于 90%
      results.forEach(r => {
        expect(r.successRate).toBeGreaterThan(0.9);
      });
    });
  });

  describe('Endurance Tests', () => {
    it('should maintain performance over sustained load', async () => {
      const duration = 10000; // 10 秒
      const interval = 100; // 每 100ms 发送一个请求
      const requests: Promise<any>[] = [];
      
      const startTime = Date.now();
      
      // 在 10 秒内持续发送请求
      while (Date.now() - startTime < duration) {
        requests.push(
          request(app.getHttpServer())
            .get('/crm/customers?page=1&pageSize=5')
            .set('Authorization', `Bearer ${authToken}`)
        );
        
        await new Promise(resolve => setTimeout(resolve, interval));
      }

      const responses = await Promise.all(requests);
      const successCount = responses.filter(r => r.status === 200).length;
      const successRate = successCount / requests.length;

      console.log(`Endurance Test Results (${requests.length} requests over ${duration / 1000}s):`);
      console.log(`  Success rate: ${(successRate * 100).toFixed(2)}%`);

      expect(successRate).toBeGreaterThan(0.95);
    });
  });
});
