import { ConfigService } from '@nestjs/config';

/** 与 `uxyy-api/.env.example` 一致；仅作本地缺省，生产必须通过环境变量覆盖。 */
export const JWT_ACCESS_SECRET_DEV_PLACEHOLDER =
  'please-change-this-to-a-long-random-string-for-dev-only';

export function resolveJwtAccessSecret(config: ConfigService): string {
  const raw =
    config.get<string>('JWT_ACCESS_SECRET') ??
    process.env.JWT_ACCESS_SECRET;
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (value !== '') {
    return value;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_ACCESS_SECRET must be set to a strong secret when NODE_ENV is production',
    );
  }
  return JWT_ACCESS_SECRET_DEV_PLACEHOLDER;
}
