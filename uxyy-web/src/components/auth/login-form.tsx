"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginSchema, type LoginInput } from "@uxyy/shared";
import { useAuth } from "./auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof LoginInput, string>>>({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");

    const parsed = loginSchema.safeParse({ phone, password });
    if (!parsed.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof LoginInput;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    setSubmitting(true);
    try {
      await login(parsed.data);
      // 登录成功后直接跳转，保持 loading 状态直到页面跳转
      // 这样用户不会看到按钮状态变化，体验更流畅
      await router.replace("/dashboard");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "登录失败，请重试");
      setSubmitting(false);
    }
    // 注意：成功时不重置 submitting，让 loading 状态保持到页面跳转
  }

  return (
    <Card className="w-full max-w-sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold tracking-tight text-center">
          优效营 uxyy
        </h1>
        <p className="text-sm text-text-secondary text-center">登录您的企业账号</p>

        <Input
          label="手机号"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="13800138000"
          error={errors.phone}
          autoComplete="tel"
        />

        <Input
          label="密码"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="至少 8 位"
          error={errors.password}
          autoComplete="current-password"
        />

        {serverError && (
          <p className="text-sm text-red-600 rounded-md bg-red-50 px-3 py-2">
            {serverError}
          </p>
        )}

        <Button
          type="submit"
          loading={submitting}
          loadingText="登录中..."
          className="w-full"
        >
          登录
        </Button>

        <p className="text-center text-sm text-text-secondary">
          没有账号？{" "}
          <Link
            href="/register"
            className="text-text-primary underline underline-offset-4 hover:text-text-secondary"
          >
            免费注册
          </Link>
        </p>
      </form>
    </Card>
  );
}
