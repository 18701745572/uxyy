import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: '13800138000' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^1\d{10}$/)
  phone!: string;

  @ApiProperty({ example: 'Dev12345!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;
}
