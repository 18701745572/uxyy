import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { customerCategoryTypeEnum } from '../../../db/schema/crm';

export class CreateCustomerCategoryDto {
  @IsString()
  name!: string;

  @IsEnum(customerCategoryTypeEnum)
  @IsOptional()
  type?: (typeof customerCategoryTypeEnum)[number];

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

export class UpdateCustomerCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(customerCategoryTypeEnum)
  @IsOptional()
  type?: (typeof customerCategoryTypeEnum)[number];

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}

export class CustomerCategoryListQueryDto {
  @IsEnum(customerCategoryTypeEnum)
  @IsOptional()
  type?: (typeof customerCategoryTypeEnum)[number];
}
