import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAccountSubjectDto {
  @ApiProperty({ example: '1001' })
  @IsString()
  @MaxLength(20)
  code!: string;

  @ApiProperty({ example: '库存现金' })
  @IsString()
  @MaxLength(50)
  name!: string;

  @ApiProperty({
    enum: ['asset', 'liability', 'equity', 'income', 'expense'],
  })
  @IsEnum(['asset', 'liability', 'equity', 'income', 'expense'])
  category!: 'asset' | 'liability' | 'equity' | 'income' | 'expense';

  @ApiPropertyOptional()
  @IsOptional()
  parentId?: number;

  @ApiPropertyOptional({ enum: ['debit', 'debit'], default: 'debit' })
  @IsOptional()
  @IsEnum(['debit', 'credit'])
  balanceDirection?: 'debit' | 'credit';
}

export class UpdateAccountSubjectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({
    enum: ['asset', 'liability', 'equity', 'income', 'expense'],
  })
  @IsOptional()
  @IsEnum(['asset', 'liability', 'equity', 'income', 'expense'])
  category?: 'asset' | 'liability' | 'equity' | 'income' | 'expense';

  @ApiPropertyOptional()
  @IsOptional()
  parentId?: number;

  @ApiPropertyOptional({ enum: ['debit', 'credit'] })
  @IsOptional()
  @IsEnum(['debit', 'credit'])
  balanceDirection?: 'debit' | 'credit';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AccountSubjectResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  enterpriseId!: number;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ['asset', 'liability', 'equity', 'income', 'expense'] })
  category!: string;

  @ApiPropertyOptional({ nullable: true })
  parentId!: number | null;

  @ApiProperty({ enum: ['debit', 'credit'] })
  balanceDirection!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: string;
}
