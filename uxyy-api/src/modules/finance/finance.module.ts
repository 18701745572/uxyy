import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { VoucherEntryService } from './voucher-entry.service';

@Module({
  controllers: [FinanceController],
  providers: [FinanceService, VoucherEntryService],
  exports: [FinanceService, VoucherEntryService],
})
export class FinanceModule {}
