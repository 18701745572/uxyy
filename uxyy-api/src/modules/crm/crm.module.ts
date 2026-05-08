import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { QuotationController } from './controllers/quotation.controller';
import { QuotationService } from './services/quotation.service';
import { MemberController } from './controllers/member.controller';
import { MemberService } from './services/member.service';
import { AiFollowUpController } from './controllers/ai-followup.controller';
import { AiFollowUpService } from './services/ai-followup.service';
import { AiScriptController } from './controllers/ai-script.controller';
import { AiScriptService } from './services/ai-script.service';

@Module({
  imports: [AuthModule],
  controllers: [
    CrmController,
    QuotationController,
    MemberController,
    AiFollowUpController,
    AiScriptController,
  ],
  providers: [
    CrmService,
    QuotationService,
    MemberService,
    AiFollowUpService,
    AiScriptService,
  ],
  exports: [
    MemberService,
    AiFollowUpService,
    AiScriptService,
  ],
})
export class CrmModule {}
