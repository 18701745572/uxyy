import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from './common.dto';

export class ProductListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '按分类筛选' })
  @IsOptional()
  @IsInt()
  @Min(1)
  categoryId?: number;

  @ApiPropertyOptional({ description: '名称/编码/条码搜索' })
  @IsOptional()
  @IsString()
  keyword?: string;
}

export class CreateProductDto {
  @ApiProperty({ example: 'P001' })
  @IsString()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ example: '六角螺栓 M8×30' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'M8×30 8.8级' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  spec?: string;

  @ApiPropertyOptional({ example: '件', default: '件' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiProperty({ example: '12.50' })
  @IsNumber()
  unitPrice!: number;

  @ApiPropertyOptional({ example: '8.00' })
  @IsOptional()
  @IsNumber()
  costPrice?: number;

  @ApiPropertyOptional({ example: '10', default: '0' })
  @IsOptional()
  @IsNumber()
  minStock?: number;

  @ApiPropertyOptional({ example: '200' })
  @IsOptional()
  @IsNumber()
  maxStock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional({ default: 'active' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  spec?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  costPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minStock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxStock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class ProductResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  enterpriseId!: number;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  spec!: string | null;

  @ApiPropertyOptional({ nullable: true })
  unit!: string | null;

  @ApiProperty()
  unitPrice!: string;

  @ApiPropertyOptional({ nullable: true })
  costPrice!: string | null;

  @ApiPropertyOptional({ nullable: true })
  minStock!: string | null;

  @ApiPropertyOptional({ nullable: true })
  maxStock!: string | null;

  @ApiPropertyOptional({ nullable: true })
  categoryId!: number | null;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional({ nullable: true })
  currentStock!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class ProductListResponseDto {
  @ApiProperty({ type: [ProductResponseDto] })
  items!: ProductResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}

export class CreateCategoryDto {
  @ApiProperty({ example: '五金工具' })
  @IsString()
  @MaxLength(50)
  name!: string;

  @ApiPropertyOptional({ description: '父分类ID' })
  @IsOptional()
  @IsInt()
  parentId?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  parentId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class CategoryResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  enterpriseId!: number;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  parentId!: number | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty({ type: [CategoryResponseDto] })
  children!: CategoryResponseDto[];

  @ApiProperty()
  createdAt!: string;
}

export class CategoryListResponseDto {
  @ApiProperty({ type: [CategoryResponseDto] })
  items!: CategoryResponseDto[];
}
