import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const CUSTOMER_TYPES = ['personal', 'enterprise'] as const;
const CUSTOMER_LEVELS = ['VIP', 'regular', 'potential'] as const;
const CUSTOMER_SOURCES = ['manual', 'import', 'wechat'] as const;

export class CustomerListQueryDto {
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

  @ApiPropertyOptional({ enum: CUSTOMER_TYPES })
  @IsOptional()
  @IsIn(CUSTOMER_TYPES)
  type?: string;

  @ApiPropertyOptional({ enum: CUSTOMER_LEVELS })
  @IsOptional()
  @IsIn(CUSTOMER_LEVELS)
  level?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ description: '模糊搜索 name / phone / contactPerson' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDeleted = false;
}

export class CreateCustomerDto {
  @ApiProperty({ example: '杭州某某商行' })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: '13800138001' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: '张三' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactPerson?: string;

  @ApiPropertyOptional({ example: '浙江省杭州市余杭区' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ enum: CUSTOMER_TYPES, default: 'enterprise' })
  @IsOptional()
  @IsIn(CUSTOMER_TYPES)
  type?: string;

  @ApiPropertyOptional({ enum: CUSTOMER_LEVELS, default: 'regular' })
  @IsOptional()
  @IsIn(CUSTOMER_LEVELS)
  level?: string;

  @ApiPropertyOptional({ example: '零售' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  industry?: string;

  @ApiPropertyOptional({ type: [String], example: ['重点客户', '货到付款'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ enum: CUSTOMER_SOURCES, default: 'manual' })
  @IsOptional()
  @IsIn(CUSTOMER_SOURCES)
  source?: string;

  @ApiPropertyOptional({ description: '归属销售 user id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  assignedTo?: number;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @ApiPropertyOptional({ example: '重点客户 · 货到付款' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  remark?: string;

  @ApiPropertyOptional({ description: '跳过重复检测', default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  force = false;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactPerson?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiPropertyOptional({ enum: CUSTOMER_TYPES })
  @IsOptional()
  @IsIn(CUSTOMER_TYPES)
  type?: string;

  @ApiPropertyOptional({ enum: CUSTOMER_LEVELS })
  @IsOptional()
  @IsIn(CUSTOMER_LEVELS)
  level?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  industry?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[] | null;

  @ApiPropertyOptional({ enum: CUSTOMER_SOURCES })
  @IsOptional()
  @IsIn(CUSTOMER_SOURCES)
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  assignedTo?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  creditLimit?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  remark?: string | null;
}

export class CustomerResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  enterpriseId!: number;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  phone!: string | null;

  @ApiPropertyOptional({ nullable: true })
  contactPerson!: string | null;

  @ApiPropertyOptional({ nullable: true })
  address!: string | null;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  level!: string;

  @ApiPropertyOptional({ nullable: true })
  industry!: string | null;

  @ApiPropertyOptional({ type: [String], nullable: true })
  tags!: string[] | null;

  @ApiProperty()
  source!: string;

  @ApiPropertyOptional({ nullable: true })
  assignedTo!: number | null;

  @ApiPropertyOptional({ nullable: true })
  creditLimit!: number | null;

  @ApiPropertyOptional({ nullable: true })
  remark!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class CustomerListResponseDto {
  @ApiProperty({ type: [CustomerResponseDto] })
  items!: CustomerResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}
