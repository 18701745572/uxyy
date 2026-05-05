import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: '13800138000' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^1\d{10}$/)
  phone!: string;

  @ApiProperty({ example: 'Dev12345!', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  smsCode!: string;

  @ApiProperty({ example: '某某商贸有限公司', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  enterpriseName!: string;
}
