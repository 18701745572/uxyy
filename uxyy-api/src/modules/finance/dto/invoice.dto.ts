import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InvoiceListQueryDto {
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

  @ApiPropertyOptional({ enum: ['unverified', 'verified', 'entered', 'void'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-01-31' })
  @IsOptional()
  @IsString()
  endDate?: string;
}

export class CreateInvoiceDto {
  @ApiProperty({ example: '4400123111' })
  @IsString()
  @MaxLength(50)
  invoiceNo!: string;

  @ApiPropertyOptional({ example: '044001900211' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  invoiceCode?: string;

  @ApiProperty({ enum: ['special', 'normal', 'electronic'] })
  @IsEnum(['special', 'normal', 'electronic'])
  type!: 'special' | 'normal' | 'electronic';

  @ApiProperty({
    example: '10000.00',
    description: '不含税金额（字符串，最多两位小数，避免浮点误差）',
  })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  amount!: string;

  @ApiPropertyOptional({ example: '13.00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  taxRate?: string;

  @ApiPropertyOptional({ example: '1300.00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  taxAmount?: string;

  @ApiProperty({ example: '11300.00', description: '含税总金额' })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  totalAmount!: string;

  @ApiPropertyOptional({ example: '某某商贸有限公司' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  buyerName?: string;

  @ApiPropertyOptional({ example: '91440100MA5xxxxxx' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  buyerTaxNo?: string;

  @ApiPropertyOptional({ example: '某某供应商有限公司' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sellerName?: string;

  @ApiPropertyOptional({ example: '91440100MA5xxxxxx' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  sellerTaxNo?: string;

  @ApiPropertyOptional({ example: '2024-01-10T00:00:00Z' })
  @IsOptional()
  @IsString()
  issueDate?: string;

  @ApiPropertyOptional({
    enum: ['sales_order', 'purchase_order'],
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  sourceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sourceId?: number;
}

export class UpdateInvoiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  invoiceNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  invoiceCode?: string;

  @ApiPropertyOptional({ enum: ['special', 'normal', 'electronic'] })
  @IsOptional()
  @IsEnum(['special', 'normal', 'electronic'])
  type?: 'special' | 'normal' | 'electronic';

  @ApiPropertyOptional({ example: '10000.00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  amount?: string;

  @ApiPropertyOptional({ example: '13.00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  taxRate?: string;

  @ApiPropertyOptional({ example: '1300.00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  taxAmount?: string;

  @ApiPropertyOptional({ example: '11300.00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  totalAmount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  buyerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  buyerTaxNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sellerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  sellerTaxNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  issueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  sourceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sourceId?: number;
}

export class InvoiceResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  enterpriseId!: number;

  @ApiProperty()
  invoiceNo!: string;

  @ApiPropertyOptional({ nullable: true })
  invoiceCode!: string | null;

  @ApiProperty({ enum: ['special', 'normal', 'electronic'] })
  type!: string;

  @ApiProperty({ example: '10000.00' })
  amount!: string;

  @ApiProperty({ example: '13.00' })
  taxRate!: string;

  @ApiProperty({ example: '1300.00' })
  taxAmount!: string;

  @ApiProperty({ example: '11300.00' })
  totalAmount!: string;

  @ApiPropertyOptional({ nullable: true })
  buyerName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  buyerTaxNo!: string | null;

  @ApiPropertyOptional({ nullable: true })
  sellerName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  sellerTaxNo!: string | null;

  @ApiPropertyOptional({ nullable: true })
  issueDate!: string | null;

  @ApiProperty({ enum: ['unverified', 'verified', 'entered', 'void'] })
  status!: string;

  @ApiPropertyOptional({ nullable: true })
  ocrData!: unknown;

  @ApiPropertyOptional({ nullable: true })
  sourceType!: string | null;

  @ApiPropertyOptional({ nullable: true })
  sourceId!: number | null;

  @ApiPropertyOptional({ nullable: true })
  createdBy!: number | null;

  @ApiProperty()
  createdAt!: string;
}

export class InvoiceListResponseDto {
  @ApiProperty({ type: [InvoiceResponseDto] })
  items!: InvoiceResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}

/** OCR 识别返回结果（占位，Agent-AI 就绪后由 AI 模块提供真实识别） */
export class OcrInvoiceResponseDto {
  @ApiProperty({ example: '4400123111' })
  invoiceNo!: string;

  @ApiPropertyOptional({ example: '044001900211' })
  invoiceCode!: string | null;

  @ApiProperty({ enum: ['special', 'normal', 'electronic'] })
  type!: string;

  @ApiProperty({ example: '10000.00' })
  amount!: string;

  @ApiProperty({ example: '13.00' })
  taxRate!: string;

  @ApiProperty({ example: '1300.00' })
  taxAmount!: string;

  @ApiProperty({ example: '11300.00' })
  totalAmount!: string;

  @ApiPropertyOptional({ example: '某某商贸有限公司' })
  buyerName!: string | null;

  @ApiPropertyOptional({ example: '91440100MA5xxxxxx' })
  buyerTaxNo!: string | null;

  @ApiPropertyOptional({ example: '某某供应商有限公司' })
  sellerName!: string | null;

  @ApiPropertyOptional({ example: '91440100MA5xxxxxx' })
  sellerTaxNo!: string | null;

  @ApiPropertyOptional({ example: '2024-01-10' })
  issueDate!: string | null;

  @ApiProperty({ example: 0.98, description: 'OCR 置信度 0-1' })
  ocrConfidence!: number;
}
