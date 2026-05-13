"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerInviteSchema } from "@uxyy/shared";
import {
  acceptInvitation,
  fetchInvitationPreview,
  registerViaInvitationInvite,
} from "@/lib/api/invitations";
import { persistAccessToken } from "@/lib/api/client";
import { persistRefreshToken, readStoredAccessToken } from "@/lib/api/token-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

/** 与同登录响应一致：`access_token` / `refresh_token` */
function persistSessionFromTokens(data: {
  access_token: string;
  refresh_token?: string;
}) {
  persistAccessToken(data.access_token);
  if (data.refresh_token) persistRefreshToken(data.refresh_token);
}

export function JoinByInvitationForm(props: {
  invitationToken: string | null | undefined;
}) {
  const router = useRouter();
  const token = (props.invitationToken ?? "").trim();

  const [previewPending, setPreviewPending] = useState(true);
  const [previewError, setPreviewError] = useState("");
  const [enterpriseName, setEnterpriseName] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [presetRole, setPresetRole] = useState("");
  const [valid, setValid] = useState(false);

  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [errors, setErrors] = useState<{
    password?: string;
    nickname?: string;
  }>({});

  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isLoggedIn = Boolean(readStoredAccessToken());

  useEffect(() => {
    if (!token) {
      setPreviewPending(false);
      setPreviewError("链接缺少邀请参数");
      setValid(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setPreviewPending(true);
      setPreviewError("");
      try {
        const p = await fetchInvitationPreview(token);
        if (cancelled) return;
        if (!p.valid) {
          setValid(false);
          setPreviewError("邀请无效或已过期");
          return;
        }
        setValid(true);
        setEnterpriseName(p.enterpriseName);
        setMaskedPhone(p.inviteePhoneMasked);
        setPresetRole(p.presetRole);
      } catch (e) {
        if (cancelled) return;
        setValid(false);
        setPreviewError(
          e instanceof Error ? e.message : "无法校验邀请链接，请重试",
        );
      } finally {
        if (!cancelled) setPreviewPending(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onAcceptInvite() {
    setServerError("");
    setSubmitting(true);
    try {
      const data = await acceptInvitation(token);
      persistSessionFromTokens(data);
      router.replace("/dashboard");
    } catch (e) {
      setServerError(
        e instanceof Error ? e.message : "接受邀请失败，请稍后重试",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function onRegisterInvite(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");
    const parsed = registerInviteSchema.safeParse({
      invitationToken: token,
      password,
      nickname: nickname.trim() ? nickname.trim() : undefined,
    });
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "password" && !next.password) next.password = issue.message;
        if (key === "nickname" && !next.nickname) next.nickname = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const data = await registerViaInvitationInvite(parsed.data);
      persistSessionFromTokens(data);
      router.replace("/dashboard");
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "注册失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold tracking-tight text-center">
          通过邀请加入企业
        </h1>

        {!token && (
          <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
            请打开管理员下发的完整邀请链接（含 t=）。
          </p>
        )}

        {previewPending && token ? (
          <p className="text-sm text-text-tertiary text-center">正在校验邀请链接…</p>
        ) : null}

        {!previewPending && previewError ? (
          <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
            {previewError}
          </p>
        ) : null}

        {!previewPending && valid ? (
          <div className="rounded-lg border border-border-secondary bg-bg-secondary px-4 py-3 text-sm space-y-1">
            <div>
              <span className="text-text-tertiary">企业：</span>
              <span className="text-text-primary font-medium">{enterpriseName}</span>
            </div>
            <div>
              <span className="text-text-tertiary">受邀手机：</span>
              <span className="font-mono text-text-primary">{maskedPhone}</span>
            </div>
            <div>
              <span className="text-text-tertiary">预设角色：</span>
              <span className="text-text-primary">{presetRole}</span>
            </div>
            <p className="text-xs text-text-tertiary mt-2">
              受邀手机号以管理员填写为准；
              {!isLoggedIn
                ? " 请设置登录密码即可完成注册。"
                : " 已登录账号必须与邀请所载手机号一致。"}
            </p>
          </div>
        ) : null}

        {serverError ? (
          <p className="text-sm text-red-600 rounded-md bg-red-50 px-3 py-2">
            {serverError}
          </p>
        ) : null}

        {!previewPending && valid && isLoggedIn ? (
          <Button
            type="button"
            className="w-full"
            loading={submitting}
            onClick={() => void onAcceptInvite()}
          >
            接受邀请并进入工作台
          </Button>
        ) : null}

        {!previewPending && valid && !isLoggedIn ? (
          <form onSubmit={onRegisterInvite} className="flex flex-col gap-3">
            <Input
              label="登录密码（至少 8 位）"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              autoComplete="new-password"
            />
            <Input
              label="昵称（可选）"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              error={errors.nickname}
            />
            <Button type="submit" className="w-full" loading={submitting}>
              注册并接受邀请
            </Button>
          </form>
        ) : null}

        <p className="text-center text-sm text-text-secondary">
          <Link
            href="/login"
            className="text-text-primary underline underline-offset-4 hover:text-text-secondary"
          >
            去登录（已注册用户使用邀请所载手机号）
          </Link>
        </p>
      </div>
    </Card>
  );
}
