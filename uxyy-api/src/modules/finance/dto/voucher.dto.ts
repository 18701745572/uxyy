import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VoucherListQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-01-31' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({
    enum: ['sales_order', 'purchase_order', 'manual', 'ai_task'],
  })
  @IsOptional()
  @IsString()
  sourceType?: string;
}

export class CreateVoucherDto {
  @ApiProperty({ example: 'V202401150001' })
  @IsString()
  @MaxLength(50)
  voucherNo!: string;

  @ApiProperty({
    enum: ['sales_order', 'purchase_order', 'manual', 'ai_task'],
  })
  @IsString()
  @MaxLength(20)
  sourceType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sourceId?: number;

  @ApiPropertyOptional({ example: '2024-01-15T00:00:00Z' })
  @IsOptional()
  @IsString()
  entryDate?: string;

  @ApiProperty({ example: '银行存款' })
  @IsString()
  @MaxLength(50)
  debitAccount!: string;

  @ApiProperty({ example: '主营业务收入' })
  @IsString()
  @MaxLength(50)
  creditAccount!: string;

  @ApiProperty({ example: '1994.90' })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  amount!: string;

  @ApiPropertyOptional({ example: '销售商品收入' })
  @IsOptional()
  @IsString()
  summary?: string;
}

export class VoucherResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  enterpriseId!: number;

  @ApiProperty()
  voucherNo!: string;

  @ApiProperty()
  sourceType!: string;

  @ApiPropertyOptional({ nullable: true })
  sourceId!: number | null;

  @ApiProperty()
  entryDate!: string;

  @ApiProperty()
  debitAccount!: string;

  @ApiProperty()
  creditAccount!: string;

  @ApiProperty({ example: '1994.90' })
  amount!: string;

  @ApiPropertyOptional({ nullable: true })
  summary!: string | null;

  @ApiProperty()
  createdBy!: number;

  @ApiProperty()
  createdAt!: string;
}

export class VoucherListResponseDto {
  @ApiProperty({ type: [VoucherResponseDto] })
  items!: VoucherResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}
