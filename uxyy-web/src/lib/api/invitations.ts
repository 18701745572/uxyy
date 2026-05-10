import type { InvitationPreviewResponse, LoginResponse } from "@uxyy/shared";
import { invitationPreviewResponseSchema } from "@uxyy/shared";
import { apiFetch } from "./client";

/** 预览邀请（不要求登录） */
export async function fetchInvitationPreview(
  invitationToken: string,
): Promise<InvitationPreviewResponse> {
  const t = invitationToken.trim();
  const qp = new URLSearchParams({ t }).toString();
  const raw = await apiFetch<unknown>(`/invitations/preview?${qp}`, {
    method: "GET",
  });
  const parsed = invitationPreviewResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return { valid: false };
  }
  return parsed.data;
}

/** 登录态接受邀请，返回与同登录 JWT 会话一致载荷 */
export async function acceptInvitation(
  invitationToken: string,
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/invitations/accept", {
    method: "POST",
    body: JSON.stringify({ invitationToken: invitationToken.trim() }),
  });
}

/** 受邀注册并入会（公开） */
export async function registerViaInvitationInvite(input: {
  invitationToken: string;
  password: string;
  nickname?: string;
}): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/register-invite", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function createEnterpriseMemberInvitation(input: {
  phone: string;
  role: string;
}): Promise<{ joinRelativePath: string; expiresAt: string }> {
  return apiFetch(`/enterprise/members/invitations`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
