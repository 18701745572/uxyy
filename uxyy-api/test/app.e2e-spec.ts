import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { join } from 'node:path';
import dotenv from 'dotenv';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.bootstrap';

dotenv.config({ path: join(__dirname, '../.env') });

/** e2e 访问 CRM 等业务路由时使用固定租户上下文（与 CI 对齐，覆盖本地 .env 可能关闭的跳过） */
process.env.AUTH_DEV_BYPASS = 'true';

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  it('GET /api/v1/health', () =>
    request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((res: { body: { status: string; service: string } }) => {
        expect(res.body.status).toBe('ok');
      }));

  it.each([
    ['/api/v1/crm/ping', 'crm'],
    ['/api/v1/inventory/ping', 'inventory'],
    ['/api/v1/finance/ping', 'finance'],
  ] as const)('GET %s', (path, mod) =>
    request(app.getHttpServer())
      .get(path)
      .expect(200)
      .expect((res: { body: { ok: boolean; module: string } }) => {
        expect(res.body.ok).toBe(true);
        expect(res.body.module).toBe(mod);
      }),
  );

  it('GET /api/v1/crm/customers paged（AUTH_DEV_BYPASS + 迁移/seed）', async () =>
    request(app.getHttpServer())
      .get('/api/v1/crm/customers?page=1&pageSize=5')
      .expect(200)
      .expect(
        (
          res: {
            body: {
              items: unknown[];
              total: number;
              page: number;
              pageSize: number;
            };
          },
        ) => {
          expect(Array.isArray(res.body.items)).toBe(true);
          expect(res.body.page).toBe(1);
          expect(res.body.pageSize).toBe(5);
          expect(res.body.total).toBeGreaterThanOrEqual(0);
        },
      ));

  afterAll(async () => {
    await app.close();
  });
});
