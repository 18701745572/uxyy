import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../db/schema';
import { DRIZZLE_DB } from './database.constants';
import { BackupService } from './services/backup.service';
import { BackupController } from './controllers/backup.controller';

export type AppDrizzleDb = NodePgDatabase<typeof schema>;

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [BackupController],
  providers: [
    {
      provide: DRIZZLE_DB,
      useFactory: (config: ConfigService) => {
        const url = config.getOrThrow<string>('DATABASE_URL');
        const pool = new Pool({ connectionString: url });
        return drizzle(pool, { schema });
      },
      inject: [ConfigService],
    },
    BackupService,
  ],
  exports: [DRIZZLE_DB, BackupService],
})
export class DatabaseModule {}
