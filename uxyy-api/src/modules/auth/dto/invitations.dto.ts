import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** 已从邀请链接预览页获取密文 token，仅存于服务端 hash；此处为明文令牌 */
export class InvitationAcceptDto {
  @ApiProperty({ example: '(base64url 邀请令牌)', minLength: 32 })
  @IsString()
  @MinLength(32)
  @MaxLength(512)
  invitationToken!: string;
}

/** `@Public()` 受邀注册（手机号以邀请为准，不经客户端指定） */
export class RegisterInviteDto {
  @ApiProperty({ minLength: 32 })
  @IsString()
  @MinLength(32)
  @MaxLength(512)
  invitationToken!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;
}
