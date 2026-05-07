import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateExpenseRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  type: string; // 差旅费、办公费、招待费等

  @IsNumberString()
  @IsNotEmpty()
  amount: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[]; // 凭证图片URL数组
}

export class UpdateExpenseRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;

  @IsOptional()
  @IsNumberString()
  amount?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}

export class ExpenseRequestQueryDto {
  @IsOptional()
  @IsString()
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled';

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
