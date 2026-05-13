import { Module } from '@nestjs/common';
import { WeComController } from './wecom.controller';
import { WeComService } from './wecom.service';

@Module({
  controllers: [WeComController],
  providers: [WeComService],
  exports: [WeComService],
})
export class WeComModule {}
