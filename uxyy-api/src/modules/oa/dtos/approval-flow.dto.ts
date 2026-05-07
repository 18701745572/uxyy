import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ApprovalStepConditionDto {
  @IsOptional()
  @IsNumber()
  gte?: number;

  @IsOptional()
  @IsNumber()
  lte?: number;
}

export class ApprovalStepDto {
  @IsInt()
  step: number;

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsOptional()
  @IsInt()
  userId?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ApprovalStepConditionDto)
  condition?: ApprovalStepConditionDto;
}

export class CreateApprovalFlowDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: 'purchase' | 'sales' | 'reimbursement' | 'leave';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalStepDto)
  steps: ApprovalStepDto[];
}

export class UpdateApprovalFlowDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalStepDto)
  steps?: ApprovalStepDto[];

  @IsOptional()
  @IsString()
  status?: 'active' | 'inactive';
}

export class ApprovalActionDto {
  @IsString()
  @IsNotEmpty()
  action: 'approve' | 'reject' | 'transfer' | 'add_sign';

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsInt()
  transferToUserId?: number;
}
