import type { ConfigService } from '@nestjs/config';

/** 与 `uxyy-api/.env.example` 一致；仅作本地缺省，生产必须通过环境变量覆盖。 */
export const JWT_ACCESS_SECRET_DEV_PLACEHOLDER =
  'please-change-this-to-a-long-random-string-for-dev-only';

export const JWT_REFRESH_SECRET_DEV_PLACEHOLDER =
  'please-change-this-refresh-secret-for-dev-only';

function resolveSecret(
  config: ConfigService | undefined,
  envKey: string,
  devPlaceholder: string,
): string {
  let value = '';
  if (config && typeof config.get === 'function') {
    const raw = config.get<string>(envKey);
    if (typeof raw === 'string') value = raw.trim();
  }
  if (value === '' && process.env[envKey]) {
    value = process.env[envKey].trim();
  }
  if (value !== '') return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `${envKey} must be set to a strong secret when NODE_ENV is production`,
    );
  }
  return devPlaceholder;
}

export function resolveJwtAccessSecret(config?: ConfigService): string {
  return resolveSecret(
    config,
    'JWT_ACCESS_SECRET',
    JWT_ACCESS_SECRET_DEV_PLACEHOLDER,
  );
}

export function resolveJwtRefreshSecret(config?: ConfigService): string {
  return resolveSecret(
    config,
    'JWT_REFRESH_SECRET',
    JWT_REFRESH_SECRET_DEV_PLACEHOLDER,
  );
}
