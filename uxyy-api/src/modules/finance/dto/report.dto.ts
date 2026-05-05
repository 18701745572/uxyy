import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardQueryDto {
  @ApiPropertyOptional({ enum: ['month', 'quarter', 'year'], default: 'month' })
  @IsOptional()
  @IsString()
  period?: string;

  @ApiPropertyOptional({ example: '2024-01' })
  @IsOptional()
  @IsString()
  date?: string;
}

export class BalanceSheetQueryDto {
  @ApiPropertyOptional({ example: '2024-01-31' })
  @IsOptional()
  @IsString()
  asOfDate?: string;
}

export class IncomeStatementQueryDto {
  @ApiPropertyOptional({ example: '2024-01' })
  @IsOptional()
  @IsString()
  period?: string;
}

export class CashFlowQueryDto {
  @ApiPropertyOptional({ example: '2024-01' })
  @IsOptional()
  @IsString()
  period?: string;
}

// ---- 报表响应 DTO ----

export class LowStockProductDto {
  @ApiProperty()
  productId!: number;

  @ApiProperty()
  productName!: string;

  @ApiProperty({ example: '5.00' })
  stockQty!: string;

  @ApiProperty({ example: '20.00' })
  minStock!: string;
}

export class TopSalesProductDto {
  @ApiProperty()
  productId!: number;

  @ApiProperty()
  productName!: string;

  @ApiProperty({ example: '200.00' })
  salesQty!: string;

  @ApiProperty({ example: '39800.00' })
  salesAmount!: string;
}

export class DashboardResponseDto {
  @ApiProperty({ example: '2024-01' })
  period!: string;

  @ApiProperty({ example: '158000.00' })
  salesAmount!: string;

  @ApiProperty()
  salesOrderCount!: number;

  @ApiProperty({ example: '98000.00' })
  purchaseAmount!: string;

  @ApiProperty()
  purchaseOrderCount!: number;

  @ApiProperty({ example: '60000.00' })
  grossProfit!: string;

  @ApiProperty({ example: '37.97%' })
  grossProfitRate!: string;

  @ApiProperty({ example: '23000.00' })
  pendingReceivable!: string;

  @ApiProperty({ example: '15000.00' })
  pendingPayable!: string;

  @ApiProperty({ type: [LowStockProductDto] })
  lowStockProducts!: LowStockProductDto[];

  @ApiProperty({ type: [TopSalesProductDto] })
  topSalesProducts!: TopSalesProductDto[];
}

export class BalanceSheetItemDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ example: '50000.00' })
  amount!: string;
}

export class BalanceSheetResponseDto {
  @ApiProperty({ example: '2024-01-31' })
  period!: string;

  @ApiProperty({ type: [BalanceSheetItemDto] })
  assets!: BalanceSheetItemDto[];

  @ApiProperty({ example: '120000.00' })
  totalAssets!: string;

  @ApiProperty({ type: [BalanceSheetItemDto] })
  liabilities!: BalanceSheetItemDto[];

  @ApiProperty({ example: '50000.00' })
  totalLiabilities!: string;

  @ApiProperty({ type: [BalanceSheetItemDto] })
  equity!: BalanceSheetItemDto[];

  @ApiProperty({ example: '70000.00' })
  totalEquity!: string;
}

export class IncomeStatementItemDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ example: '158000.00' })
  amount!: string;
}

export class IncomeStatementResponseDto {
  @ApiProperty({ example: '2024-01' })
  period!: string;

  @ApiProperty({ type: [IncomeStatementItemDto] })
  revenue!: IncomeStatementItemDto[];

  @ApiProperty({ example: '158000.00' })
  totalRevenue!: string;

  @ApiProperty({ type: [IncomeStatementItemDto] })
  costs!: IncomeStatementItemDto[];

  @ApiProperty({ example: '75000.00' })
  totalCosts!: string;

  @ApiProperty({ type: [IncomeStatementItemDto] })
  expenses!: IncomeStatementItemDto[];

  @ApiProperty({ example: '23000.00' })
  totalExpenses!: string;

  @ApiProperty({ example: '60000.00' })
  netProfit!: string;
}

export class CashFlowItemDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ example: '50000.00' })
  amount!: string;
}

export class CashFlowResponseDto {
  @ApiProperty({ example: '2024-01' })
  period!: string;

  @ApiProperty({ type: [CashFlowItemDto] })
  operatingActivities!: CashFlowItemDto[];

  @ApiProperty({ example: '35000.00' })
  netOperatingCashFlow!: string;

  @ApiProperty({ type: [CashFlowItemDto] })
  investingActivities!: CashFlowItemDto[];

  @ApiProperty({ example: '-5000.00' })
  netInvestingCashFlow!: string;

  @ApiProperty({ type: [CashFlowItemDto] })
  financingActivities!: CashFlowItemDto[];

  @ApiProperty({ example: '0.00' })
  netFinancingCashFlow!: string;

  @ApiProperty({ example: '30000.00' })
  netCashFlow!: string;

  @ApiProperty({ example: '20000.00' })
  beginningCash!: string;

  @ApiProperty({ example: '50000.00' })
  endingCash!: string;
}

export class ArApItemDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  invoiceNo!: string;

  @ApiProperty({ example: '11300.00' })
  amount!: string;

  @ApiProperty({ example: '0.00' })
  paidAmount!: string;

  @ApiProperty({ example: '11300.00' })
  balance!: string;

  @ApiPropertyOptional({ nullable: true })
  issueDate!: string | null;

  @ApiProperty()
  daysOverdue!: number;
}

export class ArApResponseDto {
  @ApiProperty({ type: [ArApItemDto] })
  receivables!: ArApItemDto[];

  @ApiProperty({ example: '23000.00' })
  totalReceivables!: string;

  @ApiProperty({ type: [ArApItemDto] })
  payables!: ArApItemDto[];

  @ApiProperty({ example: '15000.00' })
  totalPayables!: string;
}
