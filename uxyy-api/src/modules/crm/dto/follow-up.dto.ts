import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const FOLLOW_UP_TYPES = ['text', 'image', 'voice', 'file'] as const;

export class FollowUpListQueryDto {
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
}

export class CreateFollowUpDto {
  @ApiProperty({ example: '电话沟通，客户对新产品有兴趣' })
  @IsString()
  @MaxLength(8000)
  content!: string;

  @ApiPropertyOptional({ enum: FOLLOW_UP_TYPES, default: 'text' })
  @IsOptional()
  @IsIn(FOLLOW_UP_TYPES)
  type?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['https://cdn.example.com/file.pdf'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentUrls?: string[];

  @ApiPropertyOptional({ example: '2026-05-12T10:00:00.000Z', nullable: true })
  @IsOptional()
  @IsDateString()
  nextFollowUpAt?: string | null;
}

export class UpdateFollowUpDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  content?: string;

  @ApiPropertyOptional({ enum: FOLLOW_UP_TYPES })
  @IsOptional()
  @IsIn(FOLLOW_UP_TYPES)
  type?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentUrls?: string[] | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  nextFollowUpAt?: string | null;
}

export class FollowUpResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  customerId!: number;

  @ApiProperty()
  enterpriseId!: number;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  type!: string;

  @ApiPropertyOptional({ type: [String], nullable: true })
  attachmentUrls!: string[] | null;

  @ApiPropertyOptional({ nullable: true })
  nextFollowUpAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  createdBy!: number | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class FollowUpListResponseDto {
  @ApiProperty({ type: [FollowUpResponseDto] })
  items!: FollowUpResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;
}
