import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'uxyy_permissions';

/**
 * 声明访问该接口所需的权限码（OR：满足任一即可）。
 * 需配合 {@link PermissionsGuard} 使用；老板（boss / owner）拥有全部权限。
 */
export const Permissions = (...permissionCodes: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissionCodes);
