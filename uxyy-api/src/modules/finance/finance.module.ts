import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
<<<<<<< HEAD
import { VoucherEntryService } from './voucher-entry.service';

@Module({
  controllers: [FinanceController],
  providers: [FinanceService, VoucherEntryService],
  exports: [FinanceService, VoucherEntryService],
=======

@Module({
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
>>>>>>> feature/finance-core
})
export class FinanceModule {}
