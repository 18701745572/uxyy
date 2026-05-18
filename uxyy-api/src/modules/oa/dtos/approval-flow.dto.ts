import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

/** 金额 / 请假天数等阈值 */
export class StepThresholdDto {
  @ApiPropertyOptional({ example: 1000, description: '下限（≥）' })
  @IsOptional()
  @IsNumber()
  gte?: number;

  @ApiPropertyOptional({ example: 50000, description: '上限（≤）' })
  @IsOptional()
  @IsNumber()
  lte?: number;
}

/** 与 schema.ApprovalStep.condition 一致：支持 amount、days */
export class ApprovalStepConditionDto {
  @ApiPropertyOptional({
    type: StepThresholdDto,
    description: '金额条件（报销/采购/销售等）',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => StepThresholdDto)
  amount?: StepThresholdDto;

  @ApiPropertyOptional({
    type: StepThresholdDto,
    description: '请假天数等条件',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => StepThresholdDto)
  days?: StepThresholdDto;
}

export class ApprovalStepDto {
  @ApiProperty({
    example: 1,
    description: '步骤序号，服务端保存时会按顺序重写为 1…n',
  })
  @IsInt()
  step: number;

  @ApiProperty({
    example: 'boss',
    description: '审批角色码：boss / finance / sales / warehouse / oa',
  })
  @IsString()
  @IsNotEmpty()
  role: string;

  @ApiPropertyOptional({ example: 2, description: '可选：固定审批人用户 ID' })
  @IsOptional()
  @IsInt()
  userId?: number;

  @ApiPropertyOptional({ type: ApprovalStepConditionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ApprovalStepConditionDto)
  condition?: ApprovalStepConditionDto;
}

export class CreateApprovalFlowDto {
  @ApiProperty({ example: '默认请假审批' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    enum: ['purchase', 'sales', 'reimbursement', 'leave'],
    example: 'leave',
  })
  @IsIn(['purchase', 'sales', 'reimbursement', 'leave'])
  type: 'purchase' | 'sales' | 'reimbursement' | 'leave';

  @ApiProperty({ type: [ApprovalStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalStepDto)
  steps: ApprovalStepDto[];
}

export class UpdateApprovalFlowDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ type: [ApprovalStepDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalStepDto)
  steps?: ApprovalStepDto[];

  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';
}

export class ApprovalActionDto {
  @ApiProperty({
    enum: ['approve', 'reject', 'transfer', 'add_sign'],
    example: 'approve',
    description: '同意 / 驳回 / 转交（需 transferToUserId）',
  })
  @IsString()
  @IsNotEmpty()
  action: 'approve' | 'reject' | 'transfer' | 'add_sign';

  @ApiPropertyOptional({ example: '同意' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ description: 'action=transfer 时目标用户 ID' })
  @IsOptional()
  @IsInt()
  transferToUserId?: number;
}
