import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { opportunityStatusEnum } from '../../../db/schema/crm';

export class CreateOpportunityDto {
  @IsNumber()
  customerId!: number;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(opportunityStatusEnum)
  @IsOptional()
  status?: (typeof opportunityStatusEnum)[number];

  @IsNumber()
  @IsOptional()
  estimatedAmount?: number;

  @IsNumber()
  @IsOptional()
  actualAmount?: number;

  @IsDateString()
  @IsOptional()
  expectedCloseAt?: string;

  @IsDateString()
  @IsOptional()
  actualCloseAt?: string;

  @IsNumber()
  @IsOptional()
  assignedTo?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  probability?: number;

  @IsString()
  @IsOptional()
  remark?: string;
}

export class UpdateOpportunityDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(opportunityStatusEnum)
  @IsOptional()
  status?: (typeof opportunityStatusEnum)[number];

  @IsNumber()
  @IsOptional()
  estimatedAmount?: number;

  @IsNumber()
  @IsOptional()
  actualAmount?: number;

  @IsDateString()
  @IsOptional()
  expectedCloseAt?: string;

  @IsDateString()
  @IsOptional()
  actualCloseAt?: string;

  @IsNumber()
  @IsOptional()
  assignedTo?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  probability?: number;

  @IsString()
  @IsOptional()
  remark?: string;
}

export class OpportunityListQueryDto {
  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  pageSize?: number;

  @IsNumber()
  @IsOptional()
  customerId?: number;

  @IsEnum(opportunityStatusEnum)
  @IsOptional()
  status?: (typeof opportunityStatusEnum)[number];

  @IsNumber()
  @IsOptional()
  assignedTo?: number;

  @IsString()
  @IsOptional()
  search?: string;
}
