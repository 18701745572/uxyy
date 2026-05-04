import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { CrmModule } from './modules/crm/crm.module';
import { DatabaseModule } from './modules/database/database.module';
import { FinanceModule } from './modules/finance/finance.module';
import { HealthModule } from './modules/health/health.module';
import { InventoryModule } from './modules/inventory/inventory.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl =
          config.get<string>('REDIS_URL') ??
          process.env.REDIS_URL ??
          'redis://127.0.0.1:6379';
        return { connection: { url: redisUrl } };
      },
    }),
    DatabaseModule,
    AuthModule,
    CrmModule,
    InventoryModule,
    FinanceModule,
    HealthModule,
    AiModule,
  ],
})
export class AppModule {}
