import { Module } from '@nestjs/common';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { OpportunityService } from './opportunity.service';

@Module({
  controllers: [CrmController],
  providers: [CrmService, OpportunityService],
  exports: [CrmService, OpportunityService],
})
export class CrmModule {}
