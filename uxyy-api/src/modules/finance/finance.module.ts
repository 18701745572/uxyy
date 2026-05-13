import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { AiLlmService } from '../ai/ai.llm';
import { AiErrorCorrectionController } from './controllers/ai-error-correction.controller';
import { AiErrorCorrectionService } from './services/ai-error-correction.service';
import { TaxReportController } from './controllers/tax-report.controller';
import { TaxReportService } from './services/tax-report.service';
import { VoucherAuditController } from './controllers/voucher-audit.controller';
import { VoucherAuditService } from './services/voucher-audit.service';
import { AccountMappingService } from './services/account-mapping.service';
import { AutoAccountingV2Service } from './services/auto-accounting-v2.service';
import { FinanceExtensionController } from './controllers/finance-extension.controller';
import { BankStatementService } from './services/bank-statement.service';
import { InvoiceIntelligenceService } from './services/invoice-intelligence.service';
import { VoucherTemplateService } from './services/voucher-template.service';
import { FinanceIntelligenceController } from './controllers/finance-intelligence.controller';
import { AccountingLearningService } from './services/accounting-learning.service';
import { FinanceAlertService } from './services/finance-alert.service';
import { AIRecommendationService } from './services/ai-recommendation.service';

@Module({
  imports: [AuthModule, CommonModule],
  controllers: [
    FinanceController,
    AiErrorCorrectionController,
    TaxReportController,
    VoucherAuditController,
    FinanceExtensionController,
    FinanceIntelligenceController,
  ],
  providers: [
    FinanceService,
    AiLlmService,
    AiErrorCorrectionService,
    TaxReportService,
    VoucherAuditService,
    AccountMappingService,
    AutoAccountingV2Service,
    BankStatementService,
    InvoiceIntelligenceService,
    VoucherTemplateService,
    AccountingLearningService,
    FinanceAlertService,
    AIRecommendationService,
  ],
  exports: [
    FinanceService,
    AiErrorCorrectionService,
    TaxReportService,
    VoucherAuditService,
    AccountMappingService,
    AutoAccountingV2Service,
    BankStatementService,
    InvoiceIntelligenceService,
    VoucherTemplateService,
    AccountingLearningService,
    FinanceAlertService,
    AIRecommendationService,
  ],
})
export class FinanceModule {}
