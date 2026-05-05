import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateApprovalRecordDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  flowId!: number;

  @ApiProperty({ example: 'purchase_order' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  businessType!: string;

  @ApiProperty({ example: 5001 })
  @IsInt()
  @Min(1)
  businessId!: number;

  @ApiProperty({ example: '采购单 PO202401150001 审批' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ example: '急需补货' })
  @IsString()
  @IsOptional()
  remark?: string;
}

export class ApprovalActionDto {
  @ApiProperty({ example: 'approve' })
  @IsString()
  @IsIn(['approve', 'reject', 'cancel'])
  action!: string;

  @ApiPropertyOptional({ example: '同意采购' })
  @IsString()
  @IsOptional()
  comment?: string;
}

export class ApprovalRecordListQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  pageSize?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;
}

export class ApprovalRecordResponseDto {
  @ApiProperty({ example: 1001 })
  approvalId!: number;

  @ApiProperty({ example: 1 })
  flowId!: number;

  @ApiProperty({ example: 'purchase_order' })
  businessType!: string;

  @ApiProperty({ example: 5001 })
  businessId!: number;

  @ApiProperty({ example: '采购单 PO202401150001 审批' })
  title!: string;

  @ApiProperty({ example: 'pending' })
  status!: string;

  @ApiProperty({ example: 1 })
  currentStep!: number;

  @ApiProperty({ example: 2 })
  submittedBy!: number;

  @ApiPropertyOptional({ example: 2 })
  approvedBy?: number;

  @ApiPropertyOptional({ example: '同意采购' })
  comment?: string;

  @ApiPropertyOptional({ example: '2024-01-15T11:00:00Z' })
  approvedAt?: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt!: string;
}

export class ApprovalRecordListResponseDto {
  @ApiProperty({ type: [ApprovalRecordResponseDto] })
  items!: ApprovalRecordResponseDto[];

  @ApiProperty({ example: 5 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;
}
