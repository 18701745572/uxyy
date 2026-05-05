import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ApprovalStepDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  step!: number;

  @ApiProperty({ example: 'boss' })
  @IsString()
  @IsNotEmpty()
  role!: string;

  @ApiPropertyOptional({ example: { amount: { gte: 10000 } } })
  @IsObject()
  @IsOptional()
  condition?: {
    amount?: { gte?: number; lte?: number };
  };
}

export class CreateApprovalFlowDto {
  @ApiProperty({ example: '采购审批' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'purchase' })
  @IsString()
  @IsIn(['purchase', 'sales', 'reimbursement', 'leave'])
  type!: string;

  @ApiProperty({ type: [ApprovalStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalStepDto)
  steps!: ApprovalStepDto[];
}

export class ApprovalFlowListQueryDto {
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
  type?: string;
}

export class ApprovalFlowResponseDto {
  @ApiProperty({ example: 1 })
  flowId!: number;

  @ApiProperty({ example: 1 })
  enterpriseId!: number;

  @ApiProperty({ example: '采购审批' })
  name!: string;

  @ApiProperty({ example: 'purchase' })
  type!: string;

  @ApiProperty()
  steps!: ApprovalStepDto[];

  @ApiProperty({ example: 'active' })
  status!: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt!: string;
}

export class ApprovalFlowListResponseDto {
  @ApiProperty({ type: [ApprovalFlowResponseDto] })
  items!: ApprovalFlowResponseDto[];

  @ApiProperty({ example: 10 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;
}
