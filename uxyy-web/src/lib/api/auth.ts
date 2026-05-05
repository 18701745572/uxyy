import type {
  LoginInput,
  LoginResponse,
  ProfilePayload,
  RegisterInput,
  RegisterResponse,
} from "@uxyy/shared";
import { apiFetch, persistAccessToken } from "./client";

export async function login(input: LoginInput): Promise<LoginResponse> {
  const data = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  persistAccessToken(data.access_token);
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
  return data;
}

export async function fetchProfile(): Promise<ProfilePayload> {
  return apiFetch<ProfilePayload>("/auth/profile");
}
