import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

/**
 * API 性能基准测试
 * 使用 Jest 的 benchmark 模式测试关键 API 的性能
 */
describe('API Performance Benchmarks', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication Endpoints', () => {
    it('POST /auth/login - should respond within 500ms', async () => {
      const startTime = Date.now();
      
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: '13800138000',
          password: 'Test123456!',
        });
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(500);
    });

    it('POST /auth/login - concurrent requests (10 users)', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/auth/login')
          .send({
            phone: '13800138000',
            password: 'Test123456!',
          })
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // 所有请求应该在 2 秒内完成
      expect(totalTime).toBeLessThan(2000);
      
      // 所有请求都应该返回 200 或 401
      responses.forEach(response => {
        expect([200, 401]).toContain(response.status);
      });
    });
  });

  describe('Customer Endpoints', () => {
    let authToken: string;

    beforeAll(async () => {
      // 获取认证 token
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: '13800138000',
          password: 'Test123456!',
        });
      
      authToken = response.body.accessToken;
    });

    it('GET /crm/customers - should respond within 300ms', async () => {
      const startTime = Date.now();
      
      await request(app.getHttpServer())
        .get('/crm/customers?page=1&pageSize=10')
        .set('Authorization', `Bearer ${authToken}`);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(300);
    });

    it('GET /crm/customers - pagination performance test', async () => {
      const pageSizes = [10, 50, 100];
      
      for (const pageSize of pageSizes) {
        const startTime = Date.now();
        
        const response = await request(app.getHttpServer())
          .get(`/crm/customers?page=1&pageSize=${pageSize}`)
          .set('Authorization', `Bearer ${authToken}`);
        
        const responseTime = Date.now() - startTime;
        
        // 每增加 50 条记录，响应时间不应超过 100ms
        expect(responseTime).toBeLessThan(300 + pageSize * 2);
        expect(response.status).toBe(200);
      }
    });

    it('POST /crm/customers - creation performance test', async () => {
      const customers = Array(5).fill(null).map((_, i) => ({
        name: `性能测试客户${Date.now()}_${i}`,
        phone: `138${String(Math.random()).slice(2, 11)}`,
        contactPerson: '测试联系人',
        address: '测试地址',
        type: 'enterprise',
        level: 'regular',
      }));

      const startTime = Date.now();
      
      for (const customer of customers) {
        await request(app.getHttpServer())
          .post('/crm/customers')
          .set('Authorization', `Bearer ${authToken}`)
          .send(customer);
      }
      
      const totalTime = Date.now() - startTime;
      
      // 创建 5 个客户应该在 2 秒内完成
      expect(totalTime).toBeLessThan(2000);
    });
  });

  describe('Inventory Endpoints', () => {
    let authToken: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: '13800138000',
          password: 'Test123456!',
        });
      
      authToken = response.body.accessToken;
    });

    it('GET /inventory/products - should respond within 300ms', async () => {
      const startTime = Date.now();
      
      await request(app.getHttpServer())
        .get('/inventory/products?page=1&pageSize=20')
        .set('Authorization', `Bearer ${authToken}`);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(300);
    });

    it('GET /inventory/products - search performance', async () => {
      const searchTerms = ['产品', '测试', '商品'];
      
      for (const term of searchTerms) {
        const startTime = Date.now();
        
        const response = await request(app.getHttpServer())
          .get(`/inventory/products?page=1&pageSize=20&search=${encodeURIComponent(term)}`)
          .set('Authorization', `Bearer ${authToken}`);
        
        const responseTime = Date.now() - startTime;
        
        // 搜索应该在 500ms 内完成
        expect(responseTime).toBeLessThan(500);
        expect(response.status).toBe(200);
      }
    });
  });

  describe('Load Testing', () => {
    let authToken: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          phone: '13800138000',
          password: 'Test123456!',
        });
      
      authToken = response.body.accessToken;
    });

    it('should handle 50 concurrent read requests', async () => {
      const requests = Array(50).fill(null).map(() =>
        request(app.getHttpServer())
          .get('/crm/customers?page=1&pageSize=10')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // 50 个并发请求应该在 5 秒内完成
      expect(totalTime).toBeLessThan(5000);
      
      // 成功率应该大于 95%
      const successCount = responses.filter(r => r.status === 200).length;
      const successRate = successCount / responses.length;
      expect(successRate).toBeGreaterThan(0.95);
    });

    it('should handle burst traffic (100 requests in 1 second)', async () => {
      const requests = Array(100).fill(null).map((_, i) => 
        new Promise((resolve) => {
          setTimeout(async () => {
            const response = await request(app.getHttpServer())
              .get('/crm/customers?page=1&pageSize=5')
              .set('Authorization', `Bearer ${authToken}`);
            resolve(response);
          }, i * 10); // 每 10ms 发送一个请求
        })
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // 所有请求应该在 3 秒内完成
      expect(totalTime).toBeLessThan(3000);
      
      // 成功率应该大于 90%
      const successCount = responses.filter(r => (r as any).status === 200).length;
      const successRate = successCount / responses.length;
      expect(successRate).toBeGreaterThan(0.9);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during repeated requests', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // 发送 100 个请求
      for (let i = 0; i < 100; i++) {
        await request(app.getHttpServer())
          .get('/health');
      }
      
      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
      
      // 内存增长不应超过 50MB
      expect(memoryIncrease).toBeLessThan(50);
    });
  });
});
