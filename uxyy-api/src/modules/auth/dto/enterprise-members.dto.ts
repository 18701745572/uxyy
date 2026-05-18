import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ASSIGNABLE_ENTERPRISE_MEMBER_ROLES } from '../role-permissions';

/** `IsIn` 需要 `string[]` 签名；值集与 role CHECK 对齐 */
const ASSIGN_ROLE_VALUES =
  ASSIGNABLE_ENTERPRISE_MEMBER_ROLES as unknown as string[];

export class EnterpriseMemberAddDto {
  @ApiProperty({
    example: '13900138901',
    description: '必须为已注册用户手机号（中国大陆）',
  })
  @IsString()
  @MinLength(11)
  @MaxLength(11)
  @Matches(/^1\d{10}$/, { message: '请输入中国大陆 11 位手机号' })
  phone!: string;

  @ApiProperty({
    enum: ASSIGNABLE_ENTERPRISE_MEMBER_ROLES,
    description: '企业内预设角色规范码（不可为 boss）',
  })
  @IsIn(ASSIGN_ROLE_VALUES)
  role!: string;
}

export class EnterpriseMemberUpdateRoleDto {
  @ApiProperty({ enum: ASSIGNABLE_ENTERPRISE_MEMBER_ROLES })
  @IsIn(ASSIGN_ROLE_VALUES)
  role!: string;
}
