import type {
  LoginInput,
  LoginResponse,
  ProfilePayload,
  RegisterInput,
  RegisterResponse,
} from "@uxyy/shared";
import { apiFetch, persistAccessToken } from "./client";
import { persistRefreshToken } from "./token-store";

export async function login(input: LoginInput): Promise<LoginResponse> {
  const data = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  persistAccessToken(data.access_token);
  // 同时保存 refresh_token（若后端返回）
  if (data.refresh_token) {
    persistRefreshToken(data.refresh_token);
  }
  return data;
}

export async function register(
  input: RegisterInput,
): Promise<RegisterResponse> {
  const data = await apiFetch<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  persistAccessToken(data.accessToken);
  if (data.refreshToken) {
    persistRefreshToken(data.refreshToken);
  }
  return data;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
}

export async function refreshToken(
  refreshTokenValue: string,
): Promise<RefreshTokenResponse> {
  return apiFetch<RefreshTokenResponse>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshTokenValue }),
  });
}

export async function fetchProfile(): Promise<ProfilePayload> {
  return apiFetch<ProfilePayload>("/auth/profile");
}

export interface AuthPermissionsDto {
  roleRaw: string;
  canonicalRole: string | null;
  permissions: string[];
  permissionCatalog?: string[];
  validRoleCodes?: string[];
}

export async function fetchAuthPermissions(): Promise<AuthPermissionsDto> {
  return apiFetch<AuthPermissionsDto>("/auth/permissions");
}

export interface SwitchEnterpriseResponse {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
}

export async function switchEnterprise(
  enterpriseId: number,
): Promise<SwitchEnterpriseResponse> {
  const data = await apiFetch<SwitchEnterpriseResponse>(
    `/auth/switch-enterprise/${enterpriseId}`,
    { method: "PUT" },
  );
  // 保存新的 access token 和 refresh token
  persistAccessToken(data.access_token);
  if (data.refresh_token) {
    persistRefreshToken(data.refresh_token);
  }
  return data;
}
