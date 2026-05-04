import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { join } from 'node:path';
import dotenv from 'dotenv';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.bootstrap';

dotenv.config({ path: join(__dirname, '../.env') });

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

  afterAll(async () => {
    await app.close();
  });
});
